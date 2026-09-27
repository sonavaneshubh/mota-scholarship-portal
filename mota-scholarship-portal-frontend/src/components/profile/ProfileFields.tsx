/**
 * Form primitives for the applicant profile.
 *
 * Every control here is a plain labelled input with the accessibility wiring done
 * once: a real <label for>, aria-invalid, aria-describedby pointing at both the
 * hint and the error, and role="alert" on the error text so a screen reader
 * announces a validation failure as it happens rather than on the next tab.
 *
 * Styling follows the existing government-portal system: compact control height,
 * slate borders, gov-blue focus ring, amber required marker.
 */

import { useId, type ReactNode } from 'react';

const CONTROL_CLASS =
  'block w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-gov-blue/25 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const INVALID_CLASS = 'border-red-400 focus:border-red-500 focus:ring-red-500/25';

const LABEL_CLASS = 'mb-1 block text-[12px] font-semibold text-slate-700';
const HINT_CLASS = 'mt-1 text-[11px] leading-snug text-slate-500';
const ERROR_CLASS = 'mt-1 text-[11px] font-semibold text-red-700';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Rendered on the right of the label row, e.g. a character counter. */
  adornment?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  adornment,
  children,
  className = '',
}: FieldShellProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <label className={LABEL_CLASS} htmlFor={htmlFor}>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-gov-saffron-dark">
              *
            </span>
          ) : null}
        </label>
        {adornment}
      </div>
      {children}
      {hint ? (
        <p className={HINT_CLASS} id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={ERROR_CLASS} id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

interface BaseFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal';
  type?: 'text' | 'date' | 'tel' | 'email';
  /** Applied to the field wrapper, for grid placement. */
  className?: string;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  placeholder,
  disabled,
  maxLength,
  autoComplete,
  inputMode,
  type = 'text',
  className = '',
}: BaseFieldProps) {
  const id = useId();

  return (
    <FieldShell
      className={className}
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
    >
      <input
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        autoComplete={autoComplete}
        className={`${CONTROL_CLASS} ${error ? INVALID_CLASS : ''}`}
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  placeholder,
  disabled,
  rows = 3,
  maxLength,
  className = '',
}: BaseFieldProps & { rows?: number }) {
  const id = useId();

  return (
    <FieldShell
      className={className}
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
    >
      <textarea
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        className={`${CONTROL_CLASS} resize-y ${error ? INVALID_CLASS : ''}`}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<BaseFieldProps, 'onChange'> {
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Shown as a disabled first option so an unanswered select stays falsy. */
  placeholder?: string;
}

/**
 * A <select> whose options come from a master table. When the table is empty the
 * caller passes an `allowCustom` flag, which appends a free-text input — this is
 * how castes, districts, talukas, boards, universities, courses and institutions
 * work, because their contents are an administrative decision and are not seeded.
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required,
  placeholder = 'Select',
  disabled,
  allowCustom = false,
  customLabel = 'Other (type it)',
  className = '',
}: SelectFieldProps & { allowCustom?: boolean; customLabel?: string }) {
  const id = useId();
  const customId = `${id}-custom`;
  const customActive = allowCustom && !options.some((option) => option.value === value) && value !== '';

  return (
    <FieldShell
      className={className}
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
    >
      <select
        aria-describedby={describedBy(id, hint, error)}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        className={`${CONTROL_CLASS} ${error ? INVALID_CLASS : ''}`}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={customActive ? '__custom__' : value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {allowCustom ? <option value="__custom__">{customLabel}</option> : null}
      </select>

      {customActive ? (
        <input
          aria-describedby={describedBy(id, hint, error)}
          aria-invalid={Boolean(error)}
          aria-label={`${label} — enter manually`}
          className={`${CONTROL_CLASS} mt-1.5 ${error ? INVALID_CLASS : ''}`}
          disabled={disabled}
          id={customId}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type the value"
          type="text"
          value={value}
        />
      ) : null}
    </FieldShell>
  );
}

interface YesNoFieldProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Tri-state radio group for "applicant has answered yes / no / not yet".
 * A tri-state is the only honest control for these questions: defaulting either
 * answer would silently answer a question the applicant never read, and the
 * completeness rules treat an unanswered question as missing.
 */
export function YesNoField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  yesLabel = 'Yes',
  noLabel = 'No',
}: YesNoFieldProps) {
  const id = useId();
  const yesId = `${id}-yes`;
  const noId = `${id}-no`;

  return (
    <fieldset
      aria-describedby={describedBy(id, hint, error)}
      aria-invalid={Boolean(error) || undefined}
      className={error ? 'rounded border-l-2 border-red-400 pl-2' : ''}
    >
      <legend className={LABEL_CLASS}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-gov-saffron-dark">
            *
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap items-center gap-4 pt-0.5">
        {(
          [
            { inputId: yesId, optionValue: true, text: yesLabel },
            { inputId: noId, optionValue: false, text: noLabel },
          ] as const
        ).map((option) => (
          <label
            className={`flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-700 ${
              disabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
            htmlFor={option.inputId}
            key={option.inputId}
          >
            <input
              checked={value === option.optionValue}
              className="h-3.5 w-3.5 accent-[#0b3b75]"
              disabled={disabled}
              id={option.inputId}
              name={id}
              onChange={() => onChange(option.optionValue)}
              type="radio"
            />
            {option.text}
          </label>
        ))}
      </div>
      {hint ? (
        <p className={HINT_CLASS} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={ERROR_CLASS} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

export function CheckboxField({ label, checked, onChange, hint, disabled }: CheckboxFieldProps) {
  const id = useId();

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2 text-[13px] text-slate-700" htmlFor={id}>
        <input
          checked={checked}
          className="mt-0.5 h-3.5 w-3.5 accent-[#0b3b75]"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p className={HINT_CLASS} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface MaskedSecretFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint: string;
  /** The already-stored masked value, e.g. 'XXXX XXXX 1234'. */
  storedMask: string | null;
  required: boolean;
  inputMode?: 'numeric' | 'tel';
  maxLength?: number;
  placeholder?: string;
}

/**
 * A write-only sensitive field.
 *
 * The server never returns the full value, so once it is saved the input is
 * replaced by the mask and the stored value cannot be re-read, re-displayed or
 * re-submitted by accident. This is the reason there is no "show password"
 * toggle here: there is genuinely nothing to show.
 */
export function MaskedSecretField({
  label,
  value,
  onChange,
  error,
  hint,
  storedMask,
  required,
  inputMode = 'numeric',
  maxLength,
}: MaskedSecretFieldProps) {
  const id = useId();

  if (storedMask) {
    return (
      <FieldShell
        label={label}
        htmlFor={id}
        error={error}
        adornment={<span className="text-[11px] font-semibold text-emerald-700">Saved</span>}
      >
        <div className="flex items-center justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
          {/* <output> is a labelable element, so the field label still names the
              stored value even though it can never be edited or re-read. */}
          <output className="font-mono text-[13px] font-semibold tracking-wide text-emerald-800" id={id}>
            {storedMask}
          </output>
          <button
            aria-label={`Replace the saved ${label.toLowerCase()}`}
            className="text-[11px] font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-blue-dark"
            onClick={() => onChange('')}
            type="button"
          >
            Replace
          </button>
        </div>
        <p className={HINT_CLASS} id={`${id}-hint`}>
          {hint}
        </p>
      </FieldShell>
    );
  }

  return (
    <TextField
      autoComplete="off"
      error={error}
      hint={hint}
      inputMode={inputMode}
      label={label}
      maxLength={maxLength}
      onChange={onChange}
      placeholder="Enter to save securely"
      required={required}
      value={value}
    />
  );
}

export const FORM_GRID_CLASS = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

export function Fieldset({
  legend,
  description,
  children,
  className = '',
}: {
  legend: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={`min-w-0 ${className}`}>
      <legend className="mb-2 w-full border-b border-slate-200 pb-1.5 text-[12px] font-bold uppercase tracking-wide text-gov-blue-dark">
        {legend}
      </legend>
      {description ? <p className="mb-3 text-[11px] leading-snug text-slate-500">{description}</p> : null}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}
