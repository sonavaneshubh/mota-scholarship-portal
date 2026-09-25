import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES, SITE } from '../lib/constants';

type EntryMode = 'grievance' | 'suggestion';
type DemoEntryStatus = 'Demo submitted' | 'Demo response added' | 'Demo awaiting response';

type FormValues = {
  category: string;
  subject: string;
  details: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type DemoEntry = {
  id: string;
  date: string;
  typeLabel: 'Grievance' | 'Suggestion';
  subject: string;
  status: DemoEntryStatus;
  responsePreview: string;
};

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

const INITIAL_DEMO_ENTRIES: DemoEntry[] = [
  {
    id: 'DEMO-GRV-001',
    date: '23 September 2026',
    typeLabel: 'Grievance',
    subject: 'Document correction sample for APP-2026-002',
    status: 'Demo response added',
    responsePreview:
      'Sample response: The correction workflow is represented in this prototype. No official action has been taken.',
  },
  {
    id: 'DEMO-SUG-001',
    date: '18 September 2026',
    typeLabel: 'Suggestion',
    subject: 'Clearer sample document status labels',
    status: 'Demo awaiting response',
    responsePreview:
      'No response is available. This record shows a suggestion state only and was not sent to an official service.',
  },
];

const statusToneMap: Record<DemoEntryStatus, BadgeTone> = {
  'Demo submitted': 'blue',
  'Demo response added': 'green',
  'Demo awaiting response': 'amber',
};

const fieldClassName =
  'block w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100';

function formatDemoDate() {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function ApplicantGrievancesPage() {
  const [mode, setMode] = useState<EntryMode>('grievance');
  const [values, setValues] = useState<FormValues>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [entries, setEntries] = useState<DemoEntry[]>(() => [...INITIAL_DEMO_ENTRIES]);
  const [nextReference, setNextReference] = useState(3);
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
    setStatusMessage('');
  }

  function changeMode(nextMode: EntryMode) {
    setMode(nextMode);
    setErrors({});
    setStatusMessage('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const category = values.category.trim();
    const subject = values.subject.trim();
    const details = values.details.trim();
    const email = values.email.trim();

    if (!category) {
      nextErrors.category = 'Select a category.';
    }

    if (!subject) {
      nextErrors.subject = 'Enter a subject.';
    }

    if (!details) {
      nextErrors.details = 'Enter the details of your grievance or suggestion.';
    }

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
      return;
    }

    const prefix = mode === 'grievance' ? 'GRV' : 'SUG';
    const id = `DEMO-${prefix}-${String(nextReference).padStart(3, '0')}`;
    const entry: DemoEntry = {
      id,
      date: formatDemoDate(),
      typeLabel: mode === 'grievance' ? 'Grievance' : 'Suggestion',
      subject,
      status: 'Demo submitted',
      responsePreview:
        'No response is available because this demo entry was not sent to any service.',
    };

    setEntries((current) => [entry, ...current]);
    setNextReference((current) => current + 1);
    setValues({ ...EMPTY_FORM });
    setErrors({});
    setStatusMessage(
      `${id} was added to this page only. Nothing was sent or persisted, and no official submission was created.`,
    );
  }

  function handleReset() {
    setValues({ ...EMPTY_FORM });
    setErrors({});
    setEntries([...INITIAL_DEMO_ENTRIES]);
    setNextReference(3);
    setStatusMessage(
      'The form and locally added demo entries were reset. Nothing was sent or persisted.',
    );
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
        description="Create a sample grievance or suggestion and review demo status records. This form has no backend and does not create an official case."
        eyebrow="Applicant support"
        title="Grievance / Suggestions"
      />

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        <span className="font-bold">Prototype only:</span> Do not enter real identity, financial, or
        contact information. Entries exist only in current React state and disappear on reset,
        refresh, or navigation.
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)] lg:items-start">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
                Add a demo record
              </p>
              <h2 className="mt-2 text-xl font-bold text-gov-blue-dark">Grievance or suggestion form</h2>
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
                      ? 'Report a problem with a sample workflow'
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
                Describe the issue or idea without including real personal or financial data.
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
                Use a sample address only. This prototype does not send email.
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
                Please correct the highlighted required fields. No demo entry was added.
              </p>
            ) : null}

            {statusMessage ? (
              <p
                aria-live="polite"
                className="break-words rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm leading-relaxed text-blue-900"
                role="status"
              >
                {statusMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <Button className="w-full rounded sm:w-auto" size="lg" type="submit">
                Add DEMO {mode}
              </Button>
              <Button className="w-full rounded sm:w-auto" onClick={handleReset} size="lg" variant="outline">
                Reset demo
              </Button>
            </div>
          </form>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
            Prototype support
          </p>
          <h2 className="mt-2 text-lg font-bold text-gov-blue-dark">Support placeholders</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            These details come from the prototype site data. They are not official grievance channels.
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
              <dt className="text-xs font-semibold text-slate-500">Email</dt>
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

      <section aria-labelledby="demo-entry-list-heading" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
              Current React state
            </p>
            <h2 className="mt-1 text-xl font-bold text-gov-blue-dark" id="demo-entry-list-heading">
              Demo grievance and suggestion status
            </h2>
          </div>
          <Badge tone="slate">{entries.length} sample records</Badge>
        </div>

        {entries.map((entry) => (
          <Card className="min-w-0 p-4 sm:p-5" key={entry.id}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs font-semibold text-slate-600">{entry.id}</p>
                <h3 className="mt-1 break-words text-base font-bold text-gov-blue-dark">
                  {entry.subject}
                </h3>
              </div>
              <Badge tone={statusToneMap[entry.status]}>{entry.status}</Badge>
            </div>
            <dl className="mt-4 grid gap-4 border-y border-slate-200 py-4 text-sm sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-slate-500">Prototype reference</dt>
                <dd className="mt-1 break-all font-semibold text-slate-800">{entry.id}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-slate-500">Date</dt>
                <dd className="mt-1 font-semibold text-slate-800">{entry.date}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-slate-500">Type</dt>
                <dd className="mt-1 font-semibold text-slate-800">{entry.typeLabel}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded border border-slate-200 bg-gov-slate-bg p-3">
              <p className="text-xs font-bold text-slate-600">Response preview</p>
              <p className="mt-1 break-words text-sm leading-relaxed text-slate-700">
                {entry.responsePreview}
              </p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
