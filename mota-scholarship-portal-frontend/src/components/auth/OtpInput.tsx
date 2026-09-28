import { useEffect, useRef } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';

interface OtpInputProps {
  /** Live digits, always `length` long with gaps for the ones not yet typed. */
  value: string;
  onChange: (value: string) => void;
  /** Called when the last box is filled, so the form can submit without a click. */
  onComplete?: (value: string) => void;
  length: number;
  id: string;
  label: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * One-time-code entry, as six single-character boxes.
 *
 * Splitting the field is what makes a six-digit code feel right on a phone, and
 * it costs a set of behaviours that a single input gets for free. All of them
 * are here:
 *
 *   - Typing moves to the next box, and typing in a full box replaces its digit
 *     and advances, rather than refusing the keystroke.
 *   - Backspace on an empty box moves back and clears, which is the behaviour
 *     people expect and the one that otherwise strands them.
 *   - Arrow keys move between boxes.
 *   - A pasted code is spread across the boxes from wherever the caret is, so
 *     pasting a full six-digit code into the first box works, and pasting into
 *     the third box fills the last four.
 *   - `autoComplete="one-time-code"` on the first box lets iOS and Android
 *     offer the code from the SMS or the mail app.
 *
 * A paste or an autofill that completes the code calls `onComplete`, so an
 * applicant who pastes does not then have to find the Verify button.
 *
 * The digits are never echoed anywhere else: this component holds no state of
 * its own, so the value lives in the form and dies with it.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length,
  id,
  label,
  describedBy,
  invalid = false,
  disabled = false,
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  // A paste that lands the last digit has to reach `onComplete`, but `onChange`
  // is called first and a naive effect would miss the fill entirely.
  const filledByInteractionRef = useRef(false);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    inputRefs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (filledByInteractionRef.current && value.length === length) {
      filledByInteractionRef.current = false;
      onComplete?.(value);
    }
  }, [length, onComplete, value]);

  function focusBox(index: number) {
    const target = inputRefs.current[Math.min(Math.max(index, 0), length - 1)];
    target?.focus();
    target?.select();
  }

  function writeDigit(index: number, digit: string) {
    const digits = value.padEnd(length, ' ').split('');

    // padEnd/split turns the gaps into spaces; strip them so the array indexes
    // line up with the boxes.
    for (let i = 0; i < digits.length; i += 1) {
      if (digits[i] === ' ') {
        digits[i] = '';
      }
    }

    digits[index] = digit;
    const next = digits.join('').slice(0, length);

    filledByInteractionRef.current = true;
    onChange(next);

    if (digit && index < length - 1) {
      focusBox(index + 1);
    }
  }

  function clearFrom(index: number) {
    const digits = value.padEnd(length, ' ').split('');

    for (let i = 0; i < digits.length; i += 1) {
      if (digits[i] === ' ') {
        digits[i] = '';
      }
    }

    for (let i = index; i < digits.length; i += 1) {
      digits[i] = '';
    }

    filledByInteractionRef.current = false;
    onChange(digits.join('').slice(0, length));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>, index: number) {
    const raw = event.target.value;

    // A single box can still receive several characters at once from a mobile
    // keyboard's autofill or a drag-and-drop, so anything past one digit is
    // spread across the boxes from here.
    const incoming = raw.replace(/\D/g, '');

    if (!incoming) {
      clearFrom(index);
      return;
    }

    if (incoming.length > 1) {
      spread(incoming, index);
      return;
    }

    writeDigit(index, incoming);
  }

  function spread(incoming: string, startIndex: number) {
    const digits = value.padEnd(length, ' ').split('');

    for (let i = 0; i < digits.length; i += 1) {
      if (digits[i] === ' ') {
        digits[i] = '';
      }
    }

    let cursor = startIndex;

    for (const digit of incoming) {
      if (cursor >= length) {
        break;
      }

      digits[cursor] = digit;
      cursor += 1;
    }

    const next = digits.join('').slice(0, length);

    filledByInteractionRef.current = true;
    onChange(next);
    focusBox(Math.min(cursor, length - 1));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const current = value.padEnd(length, ' ')[index];

      if (current && current !== ' ') {
        // Clear this box first; a second backspace then moves back.
        writeDigit(index, '');
        return;
      }

      if (index > 0) {
        clearFrom(index - 1);
        focusBox(index - 1);
      }

      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      clearFrom(index);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');

    if (!pasted) {
      return;
    }

    // The browser's own paste would drop all but the first character into a
    // one-character box, so it is taken over rather than merged with.
    event.preventDefault();
    spread(pasted, index);
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <div
        className="flex justify-between gap-1.5 sm:gap-2"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
      >
        <span className="sr-only" id={`${id}-label`}>
          {label}
        </span>
        {Array.from({ length }, (_, index) => {
          const digit = value[index] && value[index] !== ' ' ? value[index] : '';

          return (
            <input
              key={`${id}-${index}`}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              id={`${id}-${index}`}
              name={`${id}-${index}`}
              type="text"
              // `numeric` keeps the keypad out of the way of an alphabetic
              // layout; `maxLength` stops a stray paste from overflowing.
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={length}
              value={digit}
              disabled={disabled}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              // Each box is a real, labelled control, so a screen reader
              // announces position as well as value.
              aria-label={`${label}, digit ${index + 1} of ${length}`}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              onChange={(event) => handleChange(event, index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onPaste={(event) => handlePaste(event, index)}
              onFocus={(event) => event.target.select()}
              className={`h-11 w-full min-w-0 rounded border text-center font-mono text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                invalid
                  ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
                  : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
              } ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
