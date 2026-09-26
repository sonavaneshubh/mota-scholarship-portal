import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES, SITE } from '../lib/constants';

type EntryMode = 'grievance' | 'suggestion';

type FormValues = {
  category: string;
  subject: string;
  details: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = {
  category: '',
  subject: '',
  details: '',
  email: '',
};

const CATEGORY_OPTIONS = [
  'Application or scheme',
  'Documents',
  'Profile data',
  'Portal experience',
];

const fieldClassName =
  'block w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100';

export function ApplicantGrievancesPage() {
  const [mode, setMode] = useState<EntryMode>('grievance');
  const [values, setValues] = useState<FormValues>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<FormErrors>({});
  const categoryRef = useRef<HTMLSelectElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function changeMode(nextMode: EntryMode) {
    setMode(nextMode);
    setErrors({});
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const category = values.category.trim();
    const subject = values.subject.trim();
    const details = values.details.trim();
    const email = values.email.trim();

    if (!category) nextErrors.category = 'Select a category.';
    if (!subject) nextErrors.subject = 'Enter a subject.';
    if (!details) nextErrors.details = 'Enter the details of your grievance or suggestion.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address or leave this field blank.';
    }

    setErrors(nextErrors);

    if (nextErrors.category) {
      categoryRef.current?.focus();
      return;
    }
    if (nextErrors.subject) {
      subjectRef.current?.focus();
      return;
    }
    if (nextErrors.details) {
      detailsRef.current?.focus();
      return;
    }
    if (nextErrors.email) {
      emailRef.current?.focus();
    }
  }

  function handleReset() {
    setValues({ ...EMPTY_FORM });
    setErrors({});
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-w-0 space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={
          <Button size="md" to={ROUTES.applicant.dashboard} variant="outline">
            Back to dashboard
          </Button>
        }
        description="Prepare a grievance or suggestion for the support channel."
        eyebrow="Applicant support"
        title="Grievance / Suggestions"
      />

      {/*
        There is no grievances table and no intake endpoint, so nothing can be
        filed from here. The previous version generated references like
        "DEMO-GRV-003" and showed them as case records — a fabricated case number
        is indistinguishable from a real one to an applicant, so it must not be
        generated. The form is kept for layout only, and submission is refused
        with an explicit message instead of pretending to succeed.
      */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        <span className="font-bold">Online filing is not available yet:</span> This portal has no
        grievance intake service. Nothing you type here is sent, stored, or given a reference number.
        Do not use this form for an official complaint.
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)] lg:items-start">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
                Draft your message
              </p>
              <h2 className="mt-2 text-xl font-bold text-gov-blue-dark">Grievance or suggestion</h2>
            </div>
            <Badge tone="amber">Not submitted</Badge>
          </div>

          <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
            <fieldset>
              <legend className="text-sm font-bold text-slate-800">Entry type</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(['grievance', 'suggestion'] as const).map((option) => {
                  const label = option === 'grievance' ? 'Grievance' : 'Suggestion';
                  const description =
                    option === 'grievance'
                      ? 'Report a problem with the portal or your application'
                      : 'Share an idea for the portal';

                  return (
                    <label className="min-w-0 cursor-pointer" key={option}>
                      <input
                        checked={mode === option}
                        className="peer sr-only"
                        name="entry-mode"
                        onChange={() => changeMode(option)}
                        type="radio"
                        value={option}
                      />
                      <span className="flex min-h-16 items-center rounded border border-slate-300 bg-white px-3 py-2.5 peer-checked:border-gov-blue peer-checked:bg-blue-50 peer-checked:text-gov-blue peer-focus-visible:ring-2 peer-focus-visible:ring-gov-saffron peer-focus-visible:ring-offset-2">
                        <span>
                          <span className="block text-sm font-bold">{label}</span>
                          <span className="mt-0.5 block text-xs text-slate-600">{description}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="entry-category">
                Category <span aria-hidden="true" className="text-gov-saffron-dark">*</span>
              </label>
              <select
                aria-describedby={errors.category ? 'entry-category-error' : undefined}
                aria-invalid={Boolean(errors.category)}
                className={`${fieldClassName} mt-1.5`}
                id="entry-category"
                onChange={(event) => updateField('category', event.target.value)}
                ref={categoryRef}
                required
                value={values.category}
              >
                <option value="">Select a category</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="mt-1.5 text-xs font-semibold text-red-700" id="entry-category-error">
                  {errors.category}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="entry-subject">
                Subject <span aria-hidden="true" className="text-gov-saffron-dark">*</span>
              </label>
              <input
                aria-describedby={errors.subject ? 'entry-subject-error' : undefined}
                aria-invalid={Boolean(errors.subject)}
                className={`${fieldClassName} mt-1.5`}
                id="entry-subject"
                maxLength={120}
                onChange={(event) => updateField('subject', event.target.value)}
                ref={subjectRef}
                required
                type="text"
                value={values.subject}
              />
              {errors.subject ? (
                <p className="mt-1.5 text-xs font-semibold text-red-700" id="entry-subject-error">
                  {errors.subject}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="entry-details">
                Details <span aria-hidden="true" className="text-gov-saffron-dark">*</span>
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Describe the issue or idea. Do not include Aadhaar, bank, or other sensitive numbers.
              </p>
              <textarea
                aria-describedby={errors.details ? 'entry-details-error' : 'entry-details-help'}
                aria-invalid={Boolean(errors.details)}
                className={`${fieldClassName} mt-1.5 min-h-32 resize-y`}
                id="entry-details"
                maxLength={1500}
                onChange={(event) => updateField('details', event.target.value)}
                ref={detailsRef}
                required
                value={values.details}
              />
              {errors.details ? (
                <p className="mt-1.5 text-xs font-semibold text-red-700" id="entry-details-error">
                  {errors.details}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500" id="entry-details-help">
                  {values.details.length} of 1500 characters
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="entry-email">
                Contact email <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                No email is sent from this form.
              </p>
              <input
                aria-describedby={errors.email ? 'entry-email-error' : undefined}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                className={`${fieldClassName} mt-1.5`}
                id="entry-email"
                inputMode="email"
                maxLength={254}
                onChange={(event) => updateField('email', event.target.value)}
                ref={emailRef}
                type="email"
                value={values.email}
              />
              {errors.email ? (
                <p className="mt-1.5 text-xs font-semibold text-red-700" id="entry-email-error">
                  {errors.email}
                </p>
              ) : null}
            </div>

            {hasErrors ? (
              <p
                aria-live="assertive"
                className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                role="alert"
              >
                Please correct the highlighted required fields.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <Button className="w-full rounded sm:w-auto" size="lg" type="submit">
                Check my draft
              </Button>
              <Button className="w-full rounded sm:w-auto" onClick={handleReset} size="lg" variant="outline">
                Clear
              </Button>
            </div>
          </form>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
            Support
          </p>
          <h2 className="mt-2 text-lg font-bold text-gov-blue-dark">Where to send this</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            These details come from the site configuration. They are not verified official grievance
            channels — confirm them on the ministry website before sending anything.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-500">Helpdesk</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {SITE.helpdeskLabel}: {SITE.helpdeskPhone}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Hours</dt>
              <dd className="mt-1 text-slate-700">{SITE.helpdeskHours}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-slate-500">Email (unverified)</dt>
              <dd className="mt-1 break-words font-semibold text-gov-blue">{SITE.email}</dd>
            </div>
          </dl>
          <div className="mt-5 space-y-3">
            <Button className="w-full rounded" size="md" to={ROUTES.applicant.guidelines} variant="primary">
              Read applicant guidelines
            </Button>
            <Button className="w-full rounded" size="md" to={ROUTES.helpGrievance} variant="outline">
              Open support information
            </Button>
          </div>
        </Card>
      </div>

      <section aria-labelledby="entry-list-heading" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
              Your cases
            </p>
            <h2 className="mt-1 text-xl font-bold text-gov-blue-dark" id="entry-list-heading">
              Grievance and suggestion status
            </h2>
          </div>
          <Badge tone="slate">0 records</Badge>
        </div>

        <Card className="px-5 py-10 text-center">
          <h3 className="text-base font-bold text-gov-blue-dark">No grievances or suggestions</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Nothing has been filed from this portal. Once a case is submitted through an official
            channel, its reference number and current status will be listed here.
          </p>
        </Card>
      </section>
    </div>
  );
}
