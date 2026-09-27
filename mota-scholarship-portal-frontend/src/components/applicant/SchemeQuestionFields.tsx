/**
 * The editable list of scheme-specific questions.
 *
 * Extracted from the application page so Stage 1 (Additional Information) and
 * Stage 2 (Full Application Form) render exactly the same inputs from exactly
 * the same `buildSchemeQuestions` output. Before this existed the page carried
 * the markup inline, and Stage 1 would have had to duplicate it — and two copies
 * of a 90-line form is exactly how the two stages start disagreeing about which
 * questions are required.
 *
 * There is deliberately no "profile" rendering here beyond the two read-only
 * branches: this component only draws questions, and the read-only collapsing
 * for review/print is AnswerReviewList in the page.
 */

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FORM_GRID_CLASS, SelectField, TextAreaField, TextField, YesNoField } from '../profile/ProfileFields';
import { readAnswer, type SchemeAnswers, type SchemeQuestion } from '../../lib/applicationFormRules';
import { ROUTES } from '../../lib/constants';

interface SchemeQuestionFieldsProps {
  questions: SchemeQuestion[];
  answers: SchemeAnswers;
  /** True once the application is no longer a draft. */
  disabled: boolean;
  onAnswer: (key: string, value: string) => void;
  /**
   * Spacing on the list wrapper. Stage 1 already has a heading above it, Stage 2
   * puts this inside a card after a paragraph, and the default suits the former.
   */
  className?: string;
}

export function SchemeQuestionFields({ questions, answers, disabled, onAnswer, className = 'mt-4' }: SchemeQuestionFieldsProps) {
  if (questions.length === 0) {
    return (
      <p className="text-[13px] text-slate-600">
        This scholarship needs nothing beyond your profile, so there is nothing to fill in here.
      </p>
    );
  }

  return (
    <ul className={`space-y-3 ${className}`}>
      {questions.map((question) => {
        const value = readAnswer(answers, question.key);

        return (
          <li
            className={`rounded border px-3 py-3 ${
              question.fromProfile ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
            }`}
            key={question.key}
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-slate-800">{question.label}</p>
              {question.fromProfile ? (
                <Badge tone="emerald">From My Profile</Badge>
              ) : question.required ? (
                <Badge tone="red">Required</Badge>
              ) : (
                <Badge tone="slate">Optional</Badge>
              )}
            </div>

            <p className="mb-2 text-[11px] leading-snug text-slate-500">Why this is asked: {question.because}</p>

            {question.fromProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-emerald-200 bg-white px-2.5 py-1.5">
                {/* The one branch where a question is shown but NOT an input is
                    rendered: the profile already holds the answer. */}
                <span className="text-[13px] font-semibold text-slate-800">{question.profileValue}</span>
                {/* No disabled state: My Profile is editable regardless of this
                    application's status, and following the link does not mutate
                    the application. */}
                <Button size="sm" to={ROUTES.applicant.profile} variant="ghost">
                  Change in My Profile
                </Button>
              </div>
            ) : question.control === 'profile-notice' ? (
              <div className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5">
                <p className="text-[12px] leading-snug text-amber-900">
                  This has to come from your profile rather than be typed here, so there is only ever one
                  authoritative copy of it.
                </p>
                <Button className="mt-2" size="sm" to={ROUTES.applicant.profile} variant="outline">
                  Add it in My Profile
                </Button>
              </div>
            ) : (
              <div className={FORM_GRID_CLASS}>
                {question.control === 'text' || question.control === 'number' ? (
                  <TextField
                    disabled={disabled}
                    inputMode={question.control === 'number' ? 'decimal' : 'text'}
                    label={question.label}
                    onChange={(next) => onAnswer(question.key, next)}
                    required={question.required}
                    value={value}
                  />
                ) : null}

                {question.control === 'textarea' ? (
                  <TextAreaField
                    disabled={disabled}
                    hint={question.help}
                    label={question.label}
                    onChange={(next) => onAnswer(question.key, next)}
                    required={question.required}
                    value={value}
                  />
                ) : null}

                {question.control === 'yesno' ? (
                  <YesNoField
                    disabled={disabled}
                    label={question.label}
                    onChange={(checked) => onAnswer(question.key, checked ? 'yes' : 'no')}
                    required={question.required}
                    value={value === 'yes' ? true : value === 'no' ? false : null}
                  />
                ) : null}

                {question.control === 'select' && question.options ? (
                  <SelectField
                    disabled={disabled}
                    label={question.label}
                    onChange={(next) => onAnswer(question.key, next)}
                    options={question.options}
                    required={question.required}
                    value={value}
                  />
                ) : null}
              </div>
            )}

            {question.help && !question.fromProfile && question.control !== 'textarea' ? (
              <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{question.help}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
