/**
 * Applicant profile — complete personal information.
 *
 * Sections:
 * 1. Personal Information
 * 2. Address Information
 * 3. Other Information (parents / guardian)
 * 4. Current Course
 * 5. Past Qualification
 * 6. Hostel Details
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PersonalSection } from '../components/profile/sections/PersonalSection';
import { AddressSection } from '../components/profile/sections/AddressSection';
import { OtherInfoSection } from '../components/profile/sections/OtherInfoSection';
import { CurrentCourseSection } from '../components/profile/sections/CurrentCourseSection';
import { PastQualificationSection } from '../components/profile/sections/PastQualificationSection';
import { HostelSection } from '../components/profile/sections/HostelSection';
import { ProfileStepper } from '../components/profile/ProfileStepper';
import { ROUTES } from '../lib/constants';
import { resolveContinueTarget, type ContinueTarget } from '../lib/continueTarget';
import { fetchApplicantApplications } from '../services/applicantRecords';
import {
  ensureApplicantProfile,
  fetchCompleteness,
  loadProfile,
  refreshCachedCompleteness,
  savePersonalSection,
  saveAddressSection,
  saveOtherInfoSection,
  saveCurrentCourseSection,
  saveQualificationsSection,
  saveHostelSection,
} from '../services/profileService';
import { loadProfileMasterData } from '../services/profileMasterService';
import {
  FIELD_LABELS,
  validatePersonal,
  validateAddress,
  validateOtherInfo,
  validateCurrentCourse,
  validateQualifications,
  validateHostel,
} from '../lib/profileValidation';
import {
  emptyProfileForm,
  emptyAddressForm,
  emptyOtherInfoForm,
  emptyCourseForm,
  emptyQualification,
  emptyHostelForm,
  emptyProfileData,
  profileToForm,
  addressToForm,
  otherInfoToForm,
  courseToForm,
  qualificationsToForm,
  hostelToForm,
} from '../lib/profileFormMappers';
import { computeLocalCompleteness, type LocalCompletenessInput } from '../lib/localCompleteness';
import { EMPTY_PROFILE_COMPLETENESS } from '../types/profile';
import type {
  ProfileCompleteness,
  ProfileData,
  ProfileFormValues,
  AddressFormValues,
  OtherInfoFormValues,
  CurrentCourseFormValues,
  QualificationFormValues,
  HostelFormValues,
  ProfileMasterData,
  ProfileSectionId,
  ApplicantDocumentRecord,
} from '../types/profile';

const SECTIONS: Array<{ id: ProfileSectionId; label: string; heading: string; blurb: string }> = [
  {
    id: 'personal',
    label: 'Personal',
    heading: 'Personal Information',
    blurb: 'Your basic details required for all scholarship applications.',
  },
  {
    id: 'address',
    label: 'Address',
    heading: 'Address Information',
    blurb: 'Permanent and correspondence address for communication.',
  },
  {
    id: 'other',
    label: 'Family',
    heading: 'Parent / Guardian Information',
    blurb: 'Family details required for certain scholarship categories.',
  },
  {
    id: 'current_course',
    label: 'Course',
    heading: 'Current Course',
    blurb: 'Details of the course you are currently enrolled in.',
  },
  {
    id: 'past_qualification',
    label: 'Qualifications',
    heading: 'Past Qualifications',
    blurb: 'Your previous academic qualifications (10th, 12th, diploma, etc.).',
  },
  {
    id: 'hostel',
    label: 'Hostel',
    heading: 'Hostel Details',
    blurb: 'Hostel information if you are a hosteller.',
  },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ApplicantProfilePage() {
  const { user, authUser } = useApplicantAuth();
  const userId = authUser?.id ?? null;
  const navigate = useNavigate();

  const [active, setActive] = useState<ProfileSectionId>('personal');
  const [applicantId, setApplicantId] = useState<string | null>(null);
  const [applicantReference, setApplicantReference] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData>(emptyProfileData);
  const [master, setMaster] = useState<ProfileMasterData | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness>(EMPTY_PROFILE_COMPLETENESS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [continueTarget, setContinueTarget] = useState<ContinueTarget>(() =>
    resolveContinueTarget(null),
  );
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [personal, setPersonal] = useState<ProfileFormValues>(emptyProfileForm());
  const [address, setAddress] = useState<AddressFormValues>(emptyAddressForm());
  const [otherInfo, setOtherInfo] = useState<OtherInfoFormValues>(emptyOtherInfoForm());
  const [currentCourse, setCurrentCourse] = useState<CurrentCourseFormValues>(emptyCourseForm());
  const [qualifications, setQualifications] = useState<QualificationFormValues[]>([emptyQualification()]);
  const [hostel, setHostel] = useState<HostelFormValues>(emptyHostelForm());

  const markDirty = useCallback(() => setDirty(true), []);

  function patchPersonal(patch: Partial<ProfileFormValues>) {
    setPersonal((current) => ({ ...current, ...patch }));
    markDirty();
  }

  function patchAddress(patch: Partial<AddressFormValues>) {
    setAddress((current) => ({ ...current, ...patch }));
    markDirty();
  }

  function patchOtherInfo(patch: Partial<OtherInfoFormValues>) {
    setOtherInfo((current) => ({ ...current, ...patch }));
    markDirty();
  }

  function patchCurrentCourse(patch: Partial<CurrentCourseFormValues>) {
    setCurrentCourse((current) => ({ ...current, ...patch }));
    markDirty();
  }

  function patchHostel(patch: Partial<HostelFormValues>) {
    setHostel((current) => ({ ...current, ...patch }));
    markDirty();
  }

  const busy = saveState === 'saving';

  const getSectionValues = useCallback((section: ProfileSectionId) => {
    switch (section) {
      case 'personal': return personal;
      case 'address': return address;
      case 'other': return otherInfo;
      case 'current_course': return currentCourse;
      case 'past_qualification': return qualifications;
      case 'hostel': return hostel;
    }
  }, [personal, address, otherInfo, currentCourse, qualifications, hostel]);

  const getLocalCompletenessInput = useCallback((profileData: ProfileData): LocalCompletenessInput => ({
    data: profileData,
    localAadhaarPresent: false,
    localAccountPresent: false,
  }), []);

  const reloadAfterSave = useCallback(async () => {
    if (!applicantId) return;
    const [loaded, pct, applications] = await Promise.all([
      loadProfile(applicantId),
      fetchCompleteness(),
      fetchApplicantApplications(),
    ]);
    if (loaded.ok && loaded.data) {
      setData(loaded.data);
    }
    setContinueTarget(resolveContinueTarget(applications.data));
    if (pct.ok && pct.data) {
      setCompleteness(pct.data);
    } else if (loaded.ok && loaded.data) {
      setCompleteness(computeLocalCompleteness(getLocalCompletenessInput(loaded.data)));
    }
    await refreshCachedCompleteness();
  }, [applicantId, getLocalCompletenessInput]);

  const saveSection = useCallback(
    async (section: ProfileSectionId): Promise<boolean> => {
      if (!applicantId) return false;

      setSaveState('saving');
      setSaveError(null);

      const sectionValues = getSectionValues(section);

      let validation: { valid: boolean; errors: Record<string, string> };

      if (section === 'personal') {
        const certs = {
          hasSavedAadhaar: !!data.profile?.aadhaar_last4,
          hasSavedAccount: !!data.bank?.account_number_last4,
          hasDomicileDocument: !!data.domicile?.document_id,
          hasIncomeDocument: !!data.income?.document_id,
          hasCasteDocument: !!data.caste?.document_id,
          hasDisabilityDocument: !!data.eligibility?.disability_document_id,
        };
        validation = validatePersonal(sectionValues as ProfileFormValues, certs);
      } else if (section === 'address') {
        validation = validateAddress(sectionValues as AddressFormValues);
      } else if (section === 'other') {
        validation = validateOtherInfo(sectionValues as OtherInfoFormValues);
      } else if (section === 'current_course') {
        validation = validateCurrentCourse(sectionValues as CurrentCourseFormValues);
      } else if (section === 'past_qualification') {
        validation = validateQualifications(sectionValues as QualificationFormValues[]);
      } else if (section === 'hostel') {
        const hostelCerts = data.documents?.filter(d => d.document_code === 'hosteller_certificate') ?? [];
        validation = validateHostel(sectionValues as HostelFormValues, { hasCertificate: hostelCerts.length > 0 });
      } else {
        validation = { valid: true, errors: {} };
      }

      if (!validation.valid) {
        setErrors(validation.errors);
        setSaveState('error');
        setSaveError('Some required details are missing. Check the highlighted fields.');
        return false;
      }

      let result: { ok: boolean; error?: string } = { ok: true };

      switch (section) {
        case 'personal': {
          result = await savePersonalSection(applicantId, {
            values: sectionValues as ProfileFormValues,
            ids: {
              profile: applicantId,
              domicile: data.domicile?.id ?? null,
              income: data.income?.id ?? null,
              eligibility: data.eligibility?.id ?? null,
              caste: data.caste?.id ?? null,
              bank: data.bank?.id ?? null,
            },
            documentIds: {
              domicile: data.domicile?.document_id ?? null,
              income: data.income?.document_id ?? null,
              caste: data.caste?.document_id ?? null,
              disability: data.eligibility?.disability_document_id ?? null,
            },
          });
          break;
        }
        case 'address': {
          result = await saveAddressSection(applicantId, data.address?.id ?? null, sectionValues as AddressFormValues);
          break;
        }
        case 'other': {
          result = await saveOtherInfoSection(applicantId, data.parents?.id ?? null, sectionValues as OtherInfoFormValues);
          break;
        }
        case 'current_course': {
          result = await saveCurrentCourseSection(applicantId, data.course?.id ?? null, sectionValues as CurrentCourseFormValues);
          break;
        }
        case 'past_qualification': {
          result = await saveQualificationsSection(applicantId, sectionValues as QualificationFormValues[]);
          break;
        }
        case 'hostel': {
          const hostelCert = data.documents?.find(d => d.document_code === 'hosteller_certificate');
          result = await saveHostelSection(applicantId, data.hostel?.id ?? null, sectionValues as HostelFormValues, hostelCert?.id ?? null);
          break;
        }
      }

      if (!result.ok) {
        setSaveState('error');
        setSaveError(result.error ?? 'Your changes could not be saved.');
        return false;
      }

      await reloadAfterSave();
      setDirty(false);
      setErrors({});
      setSaveState('saved');
      return true;
    },
    [applicantId, data, reloadAfterSave, getSectionValues],
  );

  const handleSaveAndGoToApplication = useCallback(async () => {
    const saved = await saveSection(active);
    if (!saved) return;
    setDirty(false);
    navigate(continueTarget.to);
  }, [active, saveSection, continueTarget.to, navigate]);

  const goToApplication = useCallback(() => {
    if (busy) return;
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    navigate(continueTarget.to);
  }, [busy, dirty, continueTarget.to, navigate]);

  /* ------------------------------------------------- load */

  const hydrate = useCallback((loaded: ProfileData) => {
    const authEmail = authUser?.email ?? '';
    const authName = user?.name ?? '';

    setData(loaded);
    setPersonal(profileToForm(loaded, authEmail, authName));
    setAddress(addressToForm(loaded));
    setOtherInfo(otherInfoToForm(loaded));
    setCurrentCourse(courseToForm(loaded));
    setQualifications(qualificationsToForm(loaded).length > 0 ? qualificationsToForm(loaded) : [emptyQualification()]);
    setHostel(hostelToForm(loaded));
    setDirty(false);
    setErrors({});
  }, [authUser?.email, user?.name]);

  const hydrateRef = useRef(hydrate);
  useEffect(() => {
    hydrateRef.current = hydrate;
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    let activeEffect = true;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      const masterResult = await loadProfileMasterData();

      const anchor = await ensureApplicantProfile(userId);
      if (!activeEffect) return;
      if (!anchor.ok || !anchor.data) {
        setLoadError(anchor.error ?? 'Your profile could not be started.');
        setLoading(false);
        return;
      }

      const [loaded, pct, applications] = await Promise.all([
        loadProfile(anchor.data.id),
        fetchCompleteness(),
        fetchApplicantApplications(),
      ]);
      if (!activeEffect) return;

      if (!loaded.ok || !loaded.data) {
        setLoadError(loaded.error ?? 'Your profile could not be loaded.');
        setLoading(false);
        return;
      }

      setMaster(masterResult);
      setApplicantId(anchor.data.id);
      setApplicantReference(loaded.data.profile?.applicant_id ?? anchor.data.applicant_id ?? null);
      hydrateRef.current(loaded.data);
      setContinueTarget(resolveContinueTarget(applications.data));
      setCompleteness(
        pct.ok && pct.data
          ? pct.data
          : computeLocalCompleteness(getLocalCompletenessInput(loaded.data)),
      );
      setLoading(false);
    })();

    return () => {
      activeEffect = false;
    };
  }, [userId, getLocalCompletenessInput]);

  /* ------------------------------------------------- unsaved-changes guards */

  useEffect(() => {
    if (!dirty) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /* ---------------------------------------------------------------- render */

  const activeDefinition = SECTIONS.find((section) => section.id === active) ?? SECTIONS[0];
  const activeIndex = SECTIONS.findIndex((section) => section.id === active);
  const isLastSection = activeIndex === SECTIONS.length - 1;
  const missingHere = completeness.missing.filter((entry) => entry.startsWith(`${active}.`));

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-10" role="status">
        <p className="text-sm text-slate-600">Loading your profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-6">
        <ApplicantPageHeader
          description="We could not load your profile. Nothing you have entered has been lost — try again in a moment."
          eyebrow="Applicant workspace"
          title="My profile"
        />
        <Card accentClass="border-l-4 border-red-500" className="p-5">
          <h2 className="text-sm font-bold text-red-800">Your profile could not be loaded</h2>
          <p className="mt-2 text-sm text-slate-700">{loadError}</p>
          <Button className="mt-4" onClick={() => window.location.reload()} variant="outline">
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  const stepperSections = SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    percent: completeness.sections[section.id] ?? 0,
  }));

  const hostelCert = data.documents?.find((d: ApplicantDocumentRecord) => d.document_code === 'hosteller_certificate');

  return (
    <div className="space-y-5 py-2 sm:py-4">
      <ApplicantPageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            {applicantReference ? (
              <Badge tone="blue">Applicant ID: {applicantReference}</Badge>
            ) : null}
            <Button disabled={busy} onClick={() => void goToApplication()} variant="primary">
              {continueTarget.label}
            </Button>
            <Button size="md" to={ROUTES.applicant.dashboard} variant="outline">
              Back to dashboard
            </Button>
          </div>
        }
        description="Complete the required details and save. Your progress is stored and you can return at any time."
        eyebrow="Applicant workspace"
        title="My profile"
      />

      {/* Overall completeness */}
      <Card accentClass="border-l-4 border-gov-saffron" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">
              Profile completeness
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {completeness.status === 'complete'
                ? 'All required details are saved. You can apply to schemes.'
                : `${completeness.complete_sections} of ${completeness.section_count} sections complete.`}
            </p>
          </div>
          <span className="text-2xl font-bold text-gov-blue-dark">{completeness.overall}%</span>
        </div>
        <div
          aria-label={`Profile ${completeness.overall} percent complete`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={completeness.overall}
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-all ${
              completeness.overall >= 100 ? 'bg-emerald-600' : 'bg-gov-saffron'
            }`}
            style={{ width: `${completeness.overall}%` }}
          />
        </div>
      </Card>

      {/* Section stepper */}
      <ProfileStepper sections={stepperSections} active={active} onSelect={setActive} />

      <Card className="p-4 sm:p-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-gov-blue-dark">
            {activeDefinition.heading}
            <span className="ml-2 text-[12px] font-medium text-slate-500">
              Step {activeIndex + 1} of {SECTIONS.length}
            </span>
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{activeDefinition.blurb}</p>
        </div>

        <div aria-live="polite" className="sr-only">
          {saveState === 'saved' ? `${activeDefinition.heading} saved.` : null}
          {saveState === 'error' && saveError ? saveError : null}
        </div>

        {saveState === 'saved' && (
          <p
            className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800"
            role="status"
          >
            {activeDefinition.heading} saved.
          </p>
        )}

        {saveState === 'error' && saveError && (
          <p
            className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800"
            role="alert"
          >
            {saveError}
          </p>
        )}

        {missingHere.length > 0 && (
          <details className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2">
            <summary className="cursor-pointer text-[12px] font-semibold text-amber-900">
              {missingHere.length} required item{missingHere.length === 1 ? '' : 's'} still needed in this
              section
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-[12px] text-amber-900">
              {missingHere.map((entry) => {
                const key = entry.split('.')[1] ?? entry;
                return <li key={entry}>{FIELD_LABELS[key] ?? key}</li>;
              })}
            </ul>
          </details>
        )}

        <div className="mt-4">
          {active === 'personal' && master && (
            <PersonalSection
              errors={errors}
              master={master}
              onChange={patchPersonal}
              values={personal}
            />
          )}
          {active === 'address' && master && (
            <AddressSection
              errors={errors}
              master={master}
              onChange={patchAddress}
              values={address}
            />
          )}
          {active === 'other' && (
            <OtherInfoSection
              errors={errors}
              onChange={patchOtherInfo}
              values={otherInfo}
            />
          )}
          {active === 'current_course' && master && (
            <CurrentCourseSection
              errors={errors}
              master={master}
              onChange={patchCurrentCourse}
              values={currentCourse}
            />
          )}
          {active === 'past_qualification' && (
            <PastQualificationSection
              errors={errors}
              onChange={setQualifications}
              values={qualifications}
            />
          )}
          {active === 'hostel' && master && (
            <HostelSection
              errors={errors}
              master={master}
              applicantId={applicantId ?? ''}
              certificate={hostelCert ?? null}
              onCertificateChange={() => {}}
              onUploadBusyChange={() => {}}
              onChange={patchHostel}
              values={hostel}
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span className="text-[12px] font-medium text-amber-700">Unsaved changes</span>
            )}
            <Button disabled={busy} onClick={() => void saveSection(active)} variant="outline">
              Save
            </Button>
            {isLastSection ? (
              <Button
                disabled={busy}
                onClick={() => void handleSaveAndGoToApplication()}
                variant="primary"
              >
                {continueTarget.resumes ? 'Save and continue application' : 'Save and find a scheme'}
              </Button>
            ) : (
              <Button
                disabled={busy}
                onClick={() => setActive(SECTIONS[activeIndex + 1].id)}
                variant="primary"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}