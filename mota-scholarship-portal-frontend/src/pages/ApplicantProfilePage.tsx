/**
 * Applicant profile — the six-section editor.
 *
 * Design decisions that matter:
 *
 *  - One section is on screen at a time, and each section owns its own Save
 *    button and its own validation. Saving section 3 must never write a
 *    half-finished section 1, so nothing is auto-saved on navigation.
 *  - "Save and continue" runs the same save as "Save" and only advances the
 *    stepper when the write actually succeeded.
 *  - Completeness prefers the number the database computes, via
 *    applicant_profile_completeness(). That function is in the undeployed
 *    20260926090100 and currently 404s, so localCompleteness recomputes the same
 *    figure from the loaded rows; the server's value wins as soon as it exists.
 *    The browser copy is otherwise used only to decide whether a Save should be
 *    blocked.
 *  - Leaving with unsaved edits warns first, including the browser's own
 *    beforeunload dialog, because a half-typed Aadhaar or bank detail silently
 *    lost is worse than an extra click.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProfileStepper, type StepperSection } from '../components/profile/ProfileStepper';
import { PersonalSection, type CertificateSlot } from '../components/profile/sections/PersonalSection';
import { AddressSection } from '../components/profile/sections/AddressSection';
import { OtherInfoSection } from '../components/profile/sections/OtherInfoSection';
import { CurrentCourseSection } from '../components/profile/sections/CurrentCourseSection';
import { PastQualificationSection } from '../components/profile/sections/PastQualificationSection';
import { HostelSection } from '../components/profile/sections/HostelSection';
import { ROUTES } from '../lib/constants';
import { resolveContinueTarget, type ContinueTarget } from '../lib/continueTarget';
import { fetchApplicantApplications } from '../services/applicantRecords';
import { readLocalAadhaar, readLocalAccountNumber } from '../lib/localSecretStore';
import { computeLocalCompleteness } from '../lib/localCompleteness';
import {
  ensureApplicantProfile,
  fetchCompleteness,
  loadProfile,
  refreshCachedCompleteness,
  saveAddressSection,
  saveCurrentCourseSection,
  saveHostelSection,
  saveOtherInfoSection,
  savePersonalSection,
  saveQualificationsSection,
} from '../services/profileService';
import { loadProfileMasterData } from '../services/profileMasterService';
import {
  FIELD_LABELS,
  validateAddress,
  validateCurrentCourse,
  validateHostel,
  validateOtherInfo,
  validatePersonal,
  validateQualifications,
} from '../lib/profileValidation';
import {
  addressToForm,
  courseToForm,
  documentsToCertificates,
  emptyProfileForm,
  emptyProfileData,
  emptyQualification,
  hostelToForm,
  otherInfoToForm,
  profileToForm,
  qualificationsToForm,
} from '../lib/profileFormMappers';
import { EMPTY_PROFILE_COMPLETENESS } from '../types/profile';
import type {
  AddressFormValues,
  ApplicantDocumentRecord,
  CurrentCourseFormValues,
  HostelFormValues,
  OtherInfoFormValues,
  ProfileCompleteness,
  ProfileData,
  ProfileFormValues,
  ProfileMasterData,
  ProfileSectionId,
  QualificationFormValues,
} from '../types/profile';

const SECTIONS: Array<{ id: ProfileSectionId; label: string; heading: string; blurb: string }> = [
  {
    id: 'personal',
    label: 'Personal',
    heading: 'Personal Information',
    blurb:
      'Identity, contact, domicile, income, category, disability and bank details. Aadhaar and the bank account number are sent once to an encrypted writer and cannot be read back later.',
  },
  {
    id: 'address',
    label: 'Address',
    heading: 'Address Information',
    blurb: 'Your permanent address, and a separate correspondence address only if it is different.',
  },
  {
    id: 'other',
    label: 'Other',
    heading: 'Other Information',
    blurb: 'Parent and guardian details. Only the questions that apply to your family are asked.',
  },
  {
    id: 'current_course',
    label: 'Course',
    heading: 'Current Course',
    blurb: 'The course you are studying now, the institution, and how you were admitted.',
  },
  {
    id: 'past_qualification',
    label: 'Qualification',
    heading: 'Past Qualification',
    blurb: 'Every qualification you have completed or am appearing for, with board or university, year and percentage.',
  },
  {
    id: 'hostel',
    label: 'Hostel',
    heading: 'Hostel Details',
    blurb: 'Only relevant if you live in a hostel. A day scholar needs to answer the category question and nothing more.',
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
  /**
   * Set when a section saved successfully but a write-only field inside it could
   * not reach the database. Kept separate from `saveError` on purpose: the save
   * genuinely succeeded, and reporting it as a failure would be as wrong as
   * hiding it. It has to be visible, because the applicant's number is not on
   * their profile and a scholarship application depends on that.
   *
   * Tagged with its section rather than cleared on navigation, so "Save and
   * continue" does not show a note about the personal section while the applicant
   * is filling in their address, and returning to Personal still shows it.
   */
  const [pendingNotice, setPendingNotice] = useState<{
    section: ProfileSectionId;
    text: string;
  } | null>(null);

  /**
   * Where the header's "continue" action points. Starts on the scheme list so the
   * button is never dead, and is upgraded to the applicant's draft application as
   * soon as one is known to exist.
   */
  const [continueTarget, setContinueTarget] = useState<ContinueTarget>(() =>
    resolveContinueTarget(null),
  );
  const [dirty, setDirty] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [personal, setPersonal] = useState<ProfileFormValues>(emptyProfileForm());
  const [address, setAddress] = useState<AddressFormValues | null>(null);
  const [otherInfo, setOtherInfo] = useState<OtherInfoFormValues | null>(null);
  const [course, setCourse] = useState<CurrentCourseFormValues | null>(null);
  const [qualifications, setQualifications] = useState<QualificationFormValues[]>([]);
  const [hostel, setHostel] = useState<HostelFormValues | null>(null);
  const [certificates, setCertificates] = useState<Record<CertificateSlot, ApplicantDocumentRecord | null>>({
    domicile: null,
    income: null,
    caste: null,
    disability: null,
  });
  const [hostelCertificate, setHostelCertificate] = useState<ApplicantDocumentRecord | null>(null);

  // Prefer what the database holds. When the SECURITY DEFINER writers are not
  // deployed the save falls back to a device-local placeholder, and the field must
  // still read as "already entered" -- otherwise the applicant is made to retype a
  // number they just saved. Only a mask and last four are ever available locally,
  // so the write-only property still holds.
  //
  // Held as primitives, not the objects localSecretStore returns, so their
  // identity is stable across renders and does not churn the save callback.
  const localAadhaarMask = authUser?.id ? (readLocalAadhaar(authUser.id)?.mask ?? null) : null;
  const localAccountLast4 = authUser?.id ? (readLocalAccountNumber(authUser.id)?.last4 ?? null) : null;

  const aadhaarMask = data.profile?.aadhaar_masked ?? localAadhaarMask;
  const accountLast4 = data.bank?.account_number_last4 ?? localAccountLast4;
  const accountMask = accountLast4 ? `•••• •••• ${accountLast4}` : null;

  /* ------------------------------------------------------------------ load */

  const hydrate = useCallback((loaded: ProfileData) => {
    const authEmail = authUser?.email ?? '';
    const authName = user?.name ?? '';

    setData(loaded);
    setPersonal(profileToForm(loaded, authEmail, authName));
    setAddress(addressToForm(loaded));
    setOtherInfo(otherInfoToForm(loaded));
    setCourse(courseToForm(loaded));
    setQualifications(qualificationsToForm(loaded));
    setHostel(hostelToForm(loaded));

    const { certificates: slots, hostel: hostelDoc } = documentsToCertificates(loaded.documents);
    setCertificates(slots);
    setHostelCertificate(hostelDoc);
    setDirty(false);
    setErrors({});
  }, [authUser?.email, user?.name]);

  /**
   * The latest hydrate, readable from the one-shot load effect without making
   * that effect depend on a function identity that changes with the user's name.
   */
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
      // Server number when the RPC exists, local recomputation otherwise. Reading
      // the device-local placeholders directly rather than through the derived
      // masks above keeps this effect keyed on userId alone, which the comment
      // below explains is deliberate.
      setCompleteness(
        pct.ok && pct.data
          ? pct.data
          : computeLocalCompleteness({
              data: loaded.data,
              localAadhaarPresent: userId ? readLocalAadhaar(userId) !== null : false,
              localAccountPresent: userId ? readLocalAccountNumber(userId) !== null : false,
            }),
      );
      setLoading(false);
    })();

    return () => {
      activeEffect = false;
    };
    // Deliberately keyed on the user id alone. This effect resets every form
    // field, so a dependency that changes identity on each render — or on a
    // late-arriving name — would silently discard the applicant's unsaved edits.
  }, [userId]);

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

  const selectSection = useCallback(
    (id: ProfileSectionId) => {
      if (id === active) return;
      if (dirty && !window.confirm('You have unsaved changes on this section. Leave without saving?')) {
        return;
      }
      setDirty(false);
      setErrors({});
      setSaveState('idle');
      setSaveError(null);
      setPendingNotice(null);
      setActive(id);
    },
    [active, dirty],
  );

  /* ------------------------------------------------------------------ save */

  const markDirty = useCallback(() => setDirty(true), []);

  function patchPersonal(patch: Partial<ProfileFormValues>) {
    setPersonal((current) => ({ ...current, ...patch }));
    markDirty();
  }

  function patchAddress(patch: Partial<AddressFormValues>) {
    setAddress((current) => ({ ...(current ?? {}), ...patch } as AddressFormValues));
    markDirty();
  }

  function patchOther(patch: Partial<OtherInfoFormValues>) {
    setOtherInfo((current) => ({ ...(current ?? {}), ...patch } as OtherInfoFormValues));
    markDirty();
  }

  function patchCourse(patch: Partial<CurrentCourseFormValues>) {
    setCourse((current) => ({ ...(current ?? {}), ...patch } as CurrentCourseFormValues));
    markDirty();
  }

  function patchHostel(patch: Partial<HostelFormValues>) {
    setHostel((current) => ({ ...(current ?? {}), ...patch } as HostelFormValues));
    markDirty();
  }

  function patchCertificate(slot: CertificateSlot, document: ApplicantDocumentRecord | null) {
    setCertificates((current) => ({ ...current, [slot]: document }));
    // The file itself is stored on upload, but the link from the section row to
    // the document is only written by Save. Without marking the section dirty an
    // upload would look complete and then be silently unlinked on navigation.
    markDirty();
  }

  // Declared before the callbacks below that depend on it: a useCallback
  // dependency array is evaluated at its call site, so referencing `busy` from a
  // callback defined above this line would throw on the temporal dead zone.
  const busy = saveState === 'saving' || uploadBusy;

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
    // Re-resolved after every save, so starting an application elsewhere in the
    // app is reflected here without a manual reload.
    setContinueTarget(resolveContinueTarget(applications.data));
    if (pct.ok && pct.data) {
      setCompleteness(pct.data);
    } else if (loaded.ok && loaded.data) {
      // applicant_profile_completeness() is in the undeployed 20260926090100, so
      // the RPC 404s. Recomputing from the rows just loaded is what makes the bar
      // respond to a save instead of sitting at 0%; the server's own number is
      // still preferred above and takes over once the migration is applied.
      setCompleteness(
        computeLocalCompleteness({
          data: loaded.data,
          localAadhaarPresent: localAadhaarMask !== null,
          localAccountPresent: localAccountLast4 !== null,
        }),
      );
    }
    await refreshCachedCompleteness();
  }, [applicantId, localAadhaarMask, localAccountLast4]);

  const saveSection = useCallback(
    async (section: ProfileSectionId): Promise<boolean> => {
      if (!applicantId) return false;

      setSaveState('saving');
      setSaveError(null);

      let result: { ok: boolean; error?: string; pendingLocally?: readonly ('aadhaar' | 'account')[] } = {
        ok: true,
      };

      switch (section) {
        case 'personal': {
          const validation = validatePersonal(personal, {
            hasSavedAadhaar: Boolean(aadhaarMask),
            // Also true when only the device-local placeholder exists, so a
            // bank account that failed to reach the database is not re-required.
            hasSavedAccount: Boolean(accountMask),
            hasDomicileDocument: Boolean(certificates.domicile),
            hasIncomeDocument: Boolean(certificates.income),
            hasCasteDocument: Boolean(certificates.caste),
            hasDisabilityDocument: Boolean(certificates.disability),
          });
          if (!validation.valid) {
            setErrors(validation.errors);
            setSaveState('error');
            setSaveError('Some required details are missing. Check the highlighted fields.');
            return false;
          }

          result = await savePersonalSection(applicantId, {
            values: personal,
            ids: {
              profile: applicantId,
              domicile: data.domicile?.id ?? null,
              income: data.income?.id ?? null,
              eligibility: data.eligibility?.id ?? null,
              caste: data.caste?.id ?? null,
              bank: data.bank?.id ?? null,
            },
            documentIds: {
              domicile: certificates.domicile?.id ?? null,
              income: certificates.income?.id ?? null,
              caste: certificates.caste?.id ?? null,
              disability: certificates.disability?.id ?? null,
            },
          }, authUser ? { localSecretKey: authUser.id } : {});

          // The two write-only fields must not survive a successful save, even
          // in memory, so a later re-render cannot resubmit them.
          if (result.ok) {
            setPersonal((current) => ({ ...current, aadhaar: '', account_number: '' }));

            // Survived the save, but is not on the profile. Say so in the field's
            // own terms: only a mask and the last four digits were kept, on this
            // device, and the number must be entered again once the writer exists.
            const pending = result.pendingLocally ?? [];
            if (pending.length > 0) {
              const labels = pending
                .map((field) => (field === 'aadhaar' ? 'Aadhaar number' : 'Bank account number'))
                .join(' and ');
              setPendingNotice({
                section: 'personal',
                text: `${labels} saved for this session only. It is not yet on your profile — re-enter it later, once verification is available.`,
              });
            } else if (!localAadhaarMask && !localAccountLast4) {
              // This save reached the writers and nothing is left over from an
              // earlier fallback, so any standing warning is now false. Cleared
              // here rather than at the start of the save, because a re-save that
              // types no new number must not silently retract the warning while the
              // number is still absent from the profile.
              setPendingNotice(null);
            }
          }
          break;
        }

        case 'address': {
          if (!address) break;
          const validation = validateAddress(address);
          if (!validation.valid) {
            setErrors(validation.errors);
            setSaveState('error');
            setSaveError('Some required details are missing. Check the highlighted fields.');
            return false;
          }
          result = await saveAddressSection(applicantId, data.address?.id ?? null, address);
          break;
        }

        case 'other': {
          if (!otherInfo) break;
          const validation = validateOtherInfo(otherInfo);
          if (!validation.valid) {
            setErrors(validation.errors);
            setSaveState('error');
            setSaveError('Some required details are missing. Check the highlighted fields.');
            return false;
          }
          result = await saveOtherInfoSection(applicantId, data.parents?.id ?? null, otherInfo);
          break;
        }

        case 'current_course': {
          if (!course) break;
          const validation = validateCurrentCourse(course);
          if (!validation.valid) {
            setErrors(validation.errors);
            setSaveState('error');
            setSaveError('Some required details are missing. Check the highlighted fields.');
            return false;
          }
          result = await saveCurrentCourseSection(applicantId, data.course?.id ?? null, course);
          break;
        }

        case 'past_qualification': {
          const rows = qualifications.length > 0 ? qualifications : [emptyQualification()];
          const validation = validateQualifications(rows);
          if (!validation.valid) {
            setErrors(validation.errors);
            setSaveState('error');
            setSaveError('Some required details are missing. Check the highlighted fields.');
            return false;
          }
          result = await saveQualificationsSection(applicantId, rows);
          break;
        }

        case 'hostel': {
          if (!hostel) break;
          const validation = validateHostel(hostel, { hasCertificate: Boolean(hostelCertificate) });
          if (!validation.valid) {
            setErrors(validation.errors);
            setSaveState('error');
            setSaveError('Some required details are missing. Check the highlighted fields.');
            return false;
          }
          result = await saveHostelSection(
            applicantId,
            data.hostel?.id ?? null,
            hostel,
            hostelCertificate?.id ?? null,
          );
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
    [
      accountMask,
      address,
      aadhaarMask,
      applicantId,
      authUser,
      certificates,
      course,
      data,
      hostel,
      hostelCertificate,
      localAccountLast4,
      localAadhaarMask,
      otherInfo,
      personal,
      qualifications,
      reloadAfterSave,
    ],
  );

  const handleSaveAndContinue = useCallback(async () => {
    const saved = await saveSection(active);
    if (!saved) return;

    const index = SECTIONS.findIndex((section) => section.id === active);
    const next = SECTIONS[index + 1];
    if (next) {
      setDirty(false);
      setErrors({});
      setSaveState('idle');
      setSaveError(null);
      setActive(next.id);
    }
  }, [active, saveSection]);

  /**
   * Last section: save, then leave for the application form.
   *
   * Navigating only after a successful save is the point. An unsaved section that
   * failed validation must keep the applicant on the page with their input intact,
   * not bounce them to the form and lose it. This is why it cannot be a plain
   * link the way the header action is.
   */
  const handleSaveAndGoToApplication = useCallback(async () => {
    const saved = await saveSection(active);
    if (!saved) return;
    setDirty(false);
    navigate(continueTarget.to);
  }, [active, saveSection, continueTarget.to, navigate]);

  /**
   * Header action: leave for the application form without saving.
   *
   * Deliberately a button rather than a link. A react-router Link changes the URL
   * in place, so beforeunload never fires and unsaved edits would be dropped
   * silently -- the same hazard switchSection guards against. This reuses that
   * guard so both ways out of the page behave the same.
   */
  const goToApplication = useCallback(() => {
    if (busy) return;
    if (dirty && !window.confirm('You have unsaved changes on this section. Leave without saving?')) {
      return;
    }
    navigate(continueTarget.to);
  }, [busy, dirty, continueTarget.to, navigate]);

  /* ---------------------------------------------------------------- render */

  const stepperSections: StepperSection[] = useMemo(
    () =>
      SECTIONS.map((section) => ({
        id: section.id,
        label: section.label,
        percent: completeness.sections[section.id] ?? 0,
      })),
    [completeness],
  );

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
        description="Complete each section and save it. Your progress is stored as you go, and you can return to any section at any time."
        eyebrow="Applicant workspace"
        title="My profile"
      />

      {/* Overall completeness, straight from the database. */}
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

      <ProfileStepper sections={stepperSections} active={active} onSelect={selectSection} />

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

        {/* One live region for the whole section: save outcomes and the count of
            outstanding required fields are both announced here. */}
        <div aria-live="polite" className="sr-only">
          {saveState === 'saved' ? `${activeDefinition.heading} saved.` : null}
          {saveState === 'error' && saveError ? saveError : null}
          {pendingNotice?.section === active ? pendingNotice.text : null}
        </div>

        {saveState === 'saved' ? (
          <p
            className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800"
            role="status"
          >
            {activeDefinition.heading} saved.
          </p>
        ) : null}

        {saveState === 'error' && saveError ? (
          <p
            className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800"
            role="alert"
          >
            {saveError}
          </p>
        ) : null}

        {/* Amber, not red: the section did save. This exists to stop a "saved"
            message from implying the Aadhaar is on the profile when it is not. */}
        {pendingNotice?.section === active ? (
          <p
            className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed font-medium text-amber-900"
            role="status"
          >
            {pendingNotice.text}
          </p>
        ) : null}

        {missingHere.length > 0 ? (
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
        ) : null}

        <div className="mt-4">
          {active === 'personal' && master ? (
            <PersonalSection
              aadhaarMask={aadhaarMask}
              accountMask={accountMask}
              applicantId={applicantId ?? ''}
              certificates={certificates}
              errors={errors}
              master={master}
              onChange={patchPersonal}
              onCertificateChange={patchCertificate}
              onUploadBusyChange={setUploadBusy}
              values={personal}
            />
          ) : null}

          {active === 'address' && address && master ? (
            <AddressSection
              errors={errors}
              master={master}
              onChange={patchAddress}
              values={address}
            />
          ) : null}

          {active === 'other' && otherInfo ? (
            <OtherInfoSection errors={errors} onChange={patchOther} values={otherInfo} />
          ) : null}

          {active === 'current_course' && course && master ? (
            <CurrentCourseSection
              errors={errors}
              master={master}
              onChange={patchCourse}
              values={course}
            />
          ) : null}

          {active === 'past_qualification' ? (
            <PastQualificationSection
              errors={errors}
              onChange={(values) => {
                setQualifications(values);
                markDirty();
              }}
              values={qualifications}
            />
          ) : null}

          {active === 'hostel' && hostel && master && applicantId ? (
            <HostelSection
              applicantId={applicantId}
              certificate={hostelCertificate}
              errors={errors}
              master={master}
              onChange={patchHostel}
              onCertificateChange={(document) => {
                setHostelCertificate(document);
                markDirty();
              }}
              onUploadBusyChange={setUploadBusy}
              values={hostel}
            />
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button
            disabled={activeIndex === 0 || busy}
            onClick={() => {
              const previous = SECTIONS[activeIndex - 1];
              if (previous) selectSection(previous.id);
            }}
            variant="outline"
          >
            Previous
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {dirty ? (
              <span className="text-[12px] font-medium text-amber-700">Unsaved changes</span>
            ) : null}
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
              <Button disabled={busy} onClick={() => void handleSaveAndContinue()} variant="primary">
                Save and continue
              </Button>
            )}
          </div>
        </div>
      </Card>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Your Aadhaar number and bank account number are sent to the server once, stored in encrypted form, and
        never displayed in full again. Uploaded certificates are stored in a private bucket and can only be
        opened by you and by verifying officers.
      </p>
    </div>
  );
}
