/**
 * The editable list of Additional Information questions.
 *
 * Shared by the Additional Information stage and by Section 4 of the application
 * form, so a value typed on one screen and corrected on the other behaves
 * identically — same validation, same control, same key in scheme_answers.
 *
 * The questions themselves are fixed and come from buildSchemeQuestions; nothing
 * here decides which ones to show. There is no per-scheme condition any more.
 *
 * Validation is read off the question, not duplicated here: `question.validate`
 * is the same function the Continue and Submit gates use, so a value this screen
 * accepts is a value those gates accept. That is the whole reason the field
 * error is produced by calling the validator rather than by a second set of
 * rules that could drift.
 *
 * The error is only shown once something has been typed. A field the applicant
 * has not touched yet is not red — it is simply required, which the label
 * already says — and a form that opens with everything flagged looks broken
 * rather than incomplete.
 */

import { TextAreaField, TextField, YesNoField } from '../profile/ProfileFields';
import { readAnswer, type SchemeAnswers, type SchemeQuestion } from '../../lib/applicationFormRules';

interface SchemeQuestionFieldsProps {
  questions: SchemeQuestion[];
  answers: SchemeAnswers;
  /** True once the application is no longer a draft. */
  disabled: boolean;
  onAnswer: (key: string, value: string) => void;
  /**
   * Spacing on the list wrapper. The Additional Information stage puts this under
   * its own heading, while Section 4 of the application form wants a gap after a
   * paragraph, so the default suits the former.
   */
  className?: string;
}

export function SchemeQuestionFields({
  questions,
  answers,
  disabled,
  onAnswer,
  className = 'mt-4',
}: SchemeQuestionFieldsProps) {
  if (questions.length === 0) {
    return (
      <p className="text-[13px] italic text-slate-400">
        There is nothing to answer for this scholarship.
      </p>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {questions.map((question) => {
        const value = readAnswer(answers, question.key);
        const trimmed = value.trim();

        // Only surface a validation failure on a field the applicant has actually
        // filled in. Blank is handled by the required marker and the blocker list
        // on the way out, not by marking the field red on arrival.
        const error =
          trimmed !== '' && question.validate ? question.validate(trimmed) : null;

        return (
          <div key={question.key}>
            {question.control === 'textarea' ? (
              <TextAreaField
                disabled={disabled}
                error={error ?? undefined}
                hint={question.help}
                label={question.label}
                onChange={(next) => onAnswer(question.key, next)}
                required={question.required}
                value={value}
              />
            ) : question.control === 'yesno' ? (
              <YesNoField
                disabled={disabled}
                error={error ?? undefined}
                hint={question.help}
                label={question.label}
                onChange={(checked) => onAnswer(question.key, checked ? 'yes' : 'no')}
                required={question.required}
                value={value === 'yes' ? true : value === 'no' ? false : null}
              />
            ) : (
              <TextField
                disabled={disabled}
                error={error ?? undefined}
                hint={question.help}
                inputMode={question.inputMode ?? (question.control === 'number' ? 'decimal' : 'text')}
                label={question.label}
                onChange={(next) => onAnswer(question.key, next)}
                required={question.required}
                value={value}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
