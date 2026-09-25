import { APPLICANT_DOCUMENTS } from '../data/applicantData';
import {
  AI_RESPONSIBILITY,
  DEFICIENCY_NOTE,
  HOW_TO_APPLY_PHASES,
} from '../data/mockData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionHeading } from '../components/ui/SectionHeading';
import { ROUTES, SITE } from '../lib/constants';
import type { ApplicantDocumentStatus } from '../types';

type DocumentGroup = {
  title: string;
  types: string[];
  description: string;
};

const GUIDELINE_SECTIONS = [
  { href: '#application-process', label: 'Application process' },
  { href: '#eligibility', label: 'Eligibility' },
  { href: '#documents', label: 'Documents' },
  { href: '#submission', label: 'Submission' },
  { href: '#deficiency-resubmission', label: 'Deficiency / resubmission' },
  { href: '#login', label: 'Login' },
  { href: '#faq', label: 'FAQ' },
];

const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    title: 'Identity document',
    types: ['Identity'],
    description: 'The sample profile uses an Aadhaar card for identity verification.',
  },
  {
    title: 'Category document',
    types: ['Category'],
    description: 'The sample profile uses a category certificate to represent category information.',
  },
  {
    title: 'Institution document',
    types: ['Academic'],
    description: 'Institution verification is represented by the Academic document type in this prototype.',
  },
  {
    title: 'Income document',
    types: ['Income'],
    description: 'The sample profile includes an income certificate and a current correction state.',
  },
  {
    title: 'Bank document',
    types: ['Bank'],
    description: 'The sample profile includes bank account proof for the prototype workflow.',
  },
];

const DOCUMENT_STATUS_GUIDANCE: Record<ApplicantDocumentStatus, string> = {
  uploaded: 'Uploaded means a file is present in the demo but is not shown as verified.',
  'under-verification': 'Under verification means the sample review is shown as in progress.',
  verified: 'Verified means the sample document record is marked as checked; this is not an official verification.',
  'needs-correction': 'Needs correction means the sample record requires replacement or correction before it can continue in the demo workflow.',
  rejected: 'Rejected means the sample file was not accepted in this prototype record.',
};

const documentStatusToneMap: Record<ApplicantDocumentStatus, BadgeTone> = {
  uploaded: 'blue',
  'under-verification': 'purple',
  verified: 'green',
  'needs-correction': 'amber',
  rejected: 'red',
};

export function ApplicantGuidelinesPage() {
  return (
    <div className="min-w-0 space-y-8 py-1 sm:py-2">
      <ApplicantPageHeader
        action={
          <Button size="md" to={ROUTES.applicant.dashboard} variant="outline">
            Back to dashboard
          </Button>
        }
        description="Use these prototype guidelines to understand the sample application, document, verification, and support workflow."
        eyebrow="Applicant workspace"
        title="Guidelines"
      />

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        <span className="font-bold">Not final official rules:</span> This page uses demonstration
        data only. Official notifications, scheme guidelines, eligibility criteria, and support
        instructions must be verified when the backend and official publishing workflow are connected.
      </div>

      <Card accentClass="border-l-4 border-gov-saffron" className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge tone="amber">Important</Badge>
            <h2 className="mt-3 text-lg font-bold text-gov-blue-dark">{AI_RESPONSIBILITY.title}</h2>
          </div>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-700">
          {AI_RESPONSIBILITY.text}
        </p>
        <p className="mt-3 rounded border border-gov-saffron/40 bg-amber-50 px-3 py-2 text-sm font-bold leading-relaxed text-amber-950">
          AI assists document verification. Final verification and decisions are performed by
          authorized officials.
        </p>
      </Card>

      <Card className="min-w-0 p-4 sm:p-5">
        <h2 className="text-base font-bold text-gov-blue-dark">On this page</h2>
        <nav aria-label="Guidelines sections" className="mt-3">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDELINE_SECTIONS.map((section) => (
              <li className="min-w-0" key={section.href}>
                <a
                  className="flex min-h-11 items-center rounded border border-slate-200 bg-gov-slate-bg px-3 py-2 text-sm font-semibold text-gov-blue underline-offset-2 hover:border-gov-saffron hover:bg-amber-50 hover:text-gov-saffron-dark focus-visible:ring-2 focus-visible:ring-gov-saffron"
                  href={section.href}
                >
                  <span className="break-words">{section.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Card>

      <section aria-labelledby="application-process" className="scroll-mt-24">
        <SectionHeading
          description="The phases below are the existing prototype workflow and are not official deadlines or scheme rules."
          eyebrow="Step-by-step demo"
          id="application-process"
          title="Application process"
        />
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HOW_TO_APPLY_PHASES.map((phase) => (
            <li className="min-w-0" key={phase.phase}>
              <Card className="h-full min-w-0 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
                    {phase.phase}
                  </span>
                  <Badge tone="slate">Demo phase</Badge>
                </div>
                <h3 className="mt-3 break-words text-base font-bold text-gov-blue-dark">
                  {phase.title}
                </h3>
                <p className="mt-2 break-words text-sm leading-relaxed text-slate-600">
                  {phase.description}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="eligibility" className="scroll-mt-24">
        <SectionHeading
          description="Use the profile fields below as a checklist. A match in this prototype is not an eligibility decision."
          eyebrow="Preliminary review only"
          id="eligibility"
          title="Eligibility"
        />
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">No final decision</Badge>
            <span className="text-xs text-slate-500">Profile fields available in this sample session</span>
          </div>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              {
                field: 'State',
                guidance: 'Compare the profile location with the scheme location scope in verified official guidelines.',
              },
              {
                field: 'District',
                guidance: 'Check the district against any official district-level requirements.',
              },
              {
                field: 'Category',
                guidance: 'Check the profile category against the official category criteria and supporting certificate.',
              },
              {
                field: 'Course',
                guidance: 'Confirm that the programme and level are covered by the selected official scheme.',
              },
              {
                field: 'Institution',
                guidance: 'Confirm the institution details against official recognition and scheme instructions.',
              },
            ].map((item) => (
              <li className="min-w-0 rounded border border-slate-200 bg-gov-slate-bg p-4" key={item.field}>
                <h3 className="text-sm font-bold text-gov-blue-dark">{item.field}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.guidance}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
            Eligibility is not finally determined here. Official criteria, documents, and authorized
            review control any future decision.
          </p>
        </Card>
      </section>

      <section aria-labelledby="documents" className="scroll-mt-24">
        <SectionHeading
          description="These are the required document types in the current sample profile, not a universal document list for every scheme."
          eyebrow="Sample document set"
          id="documents"
          title="Documents"
        />
        <div className="space-y-5">
          <Card className="min-w-0 p-4 sm:p-5">
            <h3 className="text-base font-bold text-gov-blue-dark">Status guide</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(DOCUMENT_STATUS_GUIDANCE) as ApplicantDocumentStatus[]).map((status) => (
                <div className="min-w-0 rounded border border-slate-200 p-3" key={status}>
                  <dt>
                    <Badge tone={documentStatusToneMap[status]}>
                      {status.replace('-', ' ')}
                    </Badge>
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">
                    {DOCUMENT_STATUS_GUIDANCE[status]}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DOCUMENT_GROUPS.map((group) => {
              const groupDocuments = APPLICANT_DOCUMENTS.filter((document) =>
                group.types.includes(document.type),
              );

              return (
                <Card className="min-w-0 p-4 sm:p-5" key={group.title}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="break-words text-base font-bold text-gov-blue-dark">{group.title}</h3>
                    <Badge tone="blue">Required in sample</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{group.description}</p>
                  <ul className="mt-4 space-y-3">
                    {groupDocuments.map((document) => (
                      <li className="min-w-0 border-t border-slate-200 pt-3" key={document.id}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="break-words text-sm font-semibold text-slate-800">
                            {document.name}
                          </p>
                          <Badge tone={documentStatusToneMap[document.status]}>
                            {document.statusLabel}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Type: {document.type} · {document.required ? 'Required' : 'Optional'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="submission" className="scroll-mt-24">
        <SectionHeading
          description="A submission checklist for the prototype interface. It does not create an official application."
          eyebrow="Before using a submit control"
          id="submission"
          title="Submission"
        />
        <Card className="min-w-0 p-4 sm:p-5">
          <ol className="space-y-4">
            {[
              'Confirm that you are viewing the intended sample scheme listing.',
              'Review the sample profile fields used by the application preview.',
              'Check every required sample document and its current status before continuing.',
              'Review the entered application details for accuracy before using any submit action.',
              'Treat the resulting screen as a demo preview until an official backend confirms a real submission.',
            ].map((step, index) => (
              <li className="flex min-w-0 gap-3" key={step}>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-gov-blue"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 break-words text-sm leading-relaxed text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded border border-blue-200 bg-blue-50 p-3 text-sm leading-relaxed text-blue-950">
            No submission, receipt, deadline, or payment action is connected in this browser-only prototype.
          </p>
        </Card>
      </section>

      <section aria-labelledby="deficiency-resubmission" className="scroll-mt-24">
        <SectionHeading
          description="How the sample workflow represents missing or inconsistent information."
          eyebrow="Correction workflow"
          id="deficiency-resubmission"
          title="Deficiency and resubmission"
        />
        <Card accentClass="border-l-4 border-gov-saffron" className="min-w-0 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-slate-700">{DEFICIENCY_NOTE}</p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-saffron" />
              A deficiency-raised status in the demo means a correction step has been introduced.
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-saffron" />
              A resubmission-required status means the sample workflow is waiting for the indicated correction.
            </li>
          </ul>
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
            This prototype does not set an official correction deadline, guarantee resubmission, or
            replace instructions shown in a verified official notification.
          </p>
        </Card>
      </section>

      <section aria-labelledby="login" className="scroll-mt-24">
        <SectionHeading
          description="The applicant login in this build is a local demo session."
          eyebrow="Account access"
          id="login"
          title="Login"
        />
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gov-blue-dark">Use the Home login card</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The prototype creates a sample applicant session in this browser. Registration,
                account verification, password recovery, and username recovery are not connected to
                an official identity service.
              </p>
            </div>
            <Button className="w-full rounded lg:w-auto" size="lg" to={ROUTES.homeLogin} variant="primary">
              Open login card
            </Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="faq" className="scroll-mt-24">
        <SectionHeading
          description="Answers for this prototype only. They are not legal, policy, or processing-time commitments."
          eyebrow="Common questions"
          id="faq"
          title="FAQ"
        />
        <div className="space-y-3">
          {[
            {
              question: 'Are these guidelines official?',
              answer:
                'No. They describe sample data and interface behavior. Verify official notifications, scheme rules, and support instructions when the official service is connected.',
            },
            {
              question: 'Does this page determine eligibility?',
              answer:
                'No. The profile fields are a preliminary checklist only. Final eligibility requires the applicable official criteria, documents, and authorized review.',
            },
            {
              question: 'Are documents verified when they appear in this sample?',
              answer:
                'No. A sample verified label is demonstration data. The portal does not verify identity, category, institution, income, or bank information in this build.',
            },
            {
              question: 'What happens if a document needs correction?',
              answer:
                'The demo shows a needs-correction state and explains the resubmission concept. Follow the correction instruction in the official service when one is available.',
            },
            {
              question: 'How long will verification or a decision take?',
              answer:
                'This prototype provides no guaranteed processing time. Do not rely on a deadline or response estimate shown by the demo.',
            },
            {
              question: 'Can I submit a real grievance or application here?',
              answer:
                'No. The grievance form adds a DEMO record to current React state only. Nothing is sent, persisted, or officially submitted.',
            },
            {
              question: 'Who makes the final decision?',
              answer:
                'Authorized officials make final verification and decisions. AI provides assistance only and does not make the final decision.',
            },
            {
              question: 'Where can I review prototype support?',
              answer:
                'Use the Grievance / Suggestions page or the support information linked there. The contact details shown by SITE are placeholders, not official channels.',
            },
          ].map((item) => (
            <details className="group min-w-0 rounded-lg border border-slate-200 bg-white" key={item.question}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-gov-blue-dark marker:content-none">
                <span className="break-words">{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-gov-blue group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="border-t border-slate-200 px-4 py-4 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="guideline-support" className="scroll-mt-24">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
                Prototype data notice
              </p>
              <h2 className="mt-2 text-lg font-bold text-gov-blue-dark" id="guideline-support">
                Support placeholders
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Use these prototype links to review the local workflow. Do not treat the support
                details below as an official contact or response channel.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button className="w-full rounded sm:w-auto" size="md" to={ROUTES.applicant.history} variant="primary">
                  View application history
                </Button>
                <Button className="w-full rounded sm:w-auto" size="md" to={ROUTES.applicant.grievance} variant="outline">
                  Open grievance / suggestions
                </Button>
              </div>
            </div>
            <dl className="min-w-0 space-y-3 rounded border border-slate-200 bg-gov-slate-bg p-4 text-sm">
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
                <dt className="text-xs font-semibold text-slate-500">Email placeholder</dt>
                <dd className="mt-1 break-words font-semibold text-gov-blue">{SITE.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">Prototype data updated</dt>
                <dd className="mt-1 text-slate-700">{SITE.lastUpdated}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </section>
    </div>
  );
}
