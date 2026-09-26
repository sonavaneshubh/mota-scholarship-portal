import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { APPLICANT_APPLICATIONS } from '../data/applicantData';
import { fetchSchemeDetail } from '../services/schemes';
import { evaluateEligibility, buildApplicantProfile } from '../services/eligibility';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationStatusBadge } from '../components/applicant/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantSchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useApplicantAuth();

  const [loading, setLoading] = useState(true);
  const [schemeData, setSchemeData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityEval, setEligibilityEval] = useState<{
    result: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_REVIEW';
    reasons: string[];
    matched: string[];
    missing: string[];
  } | null>(null);

  useEffect(() => {
    async function loadScheme() {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchSchemeDetail(id);
        if (!data) {
          setError('Scheme not found or not available');
          return;
        }
        
        setSchemeData(data);
        
        // Evaluate eligibility if user is logged in
        if (user && data.eligibility) {
          const applicantProfile = buildApplicantProfile({
            category: user.category,
            annual_income: null,
            course: user.course,
            gender: null,
            date_of_birth: null,
            state: user.state,
            district: user.district,
            previous_percentage: null,
            admission_mode: null,
            institution_type: null,
            is_hosteller: null,
          });
          
          const evaluation = evaluateEligibility(data.eligibility, applicantProfile);
          setEligibilityEval(evaluation);
        }
      } catch (err) {
        console.error('Failed to load scheme:', err);
        setError('Failed to load scheme details');
      } finally {
        setLoading(false);
      }
    }

    loadScheme();
  }, [id, user]);

  if (loading) {
    return (
      <div className="space-y-6 py-2 sm:py-2">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-100 rounded w-3/4" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-64 bg-slate-100 rounded" />
            <div className="h-48 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !schemeData) {
    return (
      <div className="space-y-6 py-2 sm:py-2">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-gov-blue-dark">Scheme not found</h1>
          <p className="mt-2 text-sm text-slate-600">{error || 'This scheme is not available or has not been verified.'}</p>
          <Button className="mt-5" size="md" to={ROUTES.applicant.schemes} variant="outline">Back to schemes</Button>
        </Card>
      </div>
    );
  }

  const { scheme, benefits } = schemeData;
  const existingApplication = APPLICANT_APPLICATIONS.find((app) => app.schemeId === scheme.id);

  const getEligibilityStatus = (): { label: string; tone: 'blue' | 'amber' | 'green' | 'red' | 'purple' } => {
    if (!eligibilityEval) {
      return { label: 'Eligibility unknown', tone: 'purple' };
    }
    
    switch (eligibilityEval.result) {
      case 'ELIGIBLE':
        return { label: 'Likely Eligible', tone: 'green' };
      case 'NOT_ELIGIBLE':
        return { label: 'Not Eligible', tone: 'red' };
      case 'NEEDS_REVIEW':
        return { label: 'Needs Review', tone: 'amber' };
      default:
        return { label: 'Unknown', tone: 'purple' };
    }
  };

  const eligibilityStatus = getEligibilityStatus();

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="outline">Back to schemes</Button>}
        description={scheme.description || scheme.overview || 'Official scheme information from verified sources.'}
        eyebrow={`${scheme.scheme_categories?.name || 'Scheme'} · ${scheme.academic_year}`}
        title={scheme.name}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge tone="blue">{scheme.status === 'published' && scheme.verification_status === 'verified' ? 'Verified' : 'Draft'}</Badge>
            <span className="text-xs text-slate-500">Academic Year: {scheme.academic_year}</span>
            <span className="text-xs text-slate-500">Reference: {scheme.scheme_code}</span>
          </div>

          {scheme.overview && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gov-blue-dark mb-2">Scheme Overview</h2>
              <p className="text-sm leading-relaxed text-slate-600">{scheme.overview}</p>
            </div>
          )}

          {scheme.description && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gov-blue-dark mb-2">Description</h2>
              <p className="text-sm leading-relaxed text-slate-600">{scheme.description}</p>
            </div>
          )}

          {/* Eligibility Section */}
          {schemeData.eligibility && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gov-blue-dark">Eligibility Criteria</h2>
                <Badge tone={eligibilityStatus.tone}>{eligibilityStatus.label}</Badge>
              </div>
              
              {eligibilityEval && (
                <div className="space-y-3">
                  {eligibilityEval.matched.length > 0 && (
                    <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">✓ Requirements Met</p>
                      <ul className="space-y-1 text-xs text-emerald-800">
                        {eligibilityEval.matched.map((m, i) => (
                          <li key={i} className="flex items-center gap-1">{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {eligibilityEval.missing.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">⚠ Requirements to Verify</p>
                      <ul className="space-y-1 text-xs text-amber-800">
                        {eligibilityEval.missing.map((m, i) => (
                          <li key={i} className="flex items-center gap-1">{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-3 p-3 rounded border border-slate-200 bg-slate-50">
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">Note:</span> This is a preliminary assessment based on your profile. 
                      Final eligibility is subject to document verification and authorized review.
                    </p>
                  </div>
                </div>
              )}
              <dl className="grid gap-4 border-y border-slate-100 py-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Category</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{schemeData.eligibility.category_requirement || 'As per scheme guidelines'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Income Limit</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {schemeData.eligibility.max_income ? `₹${schemeData.eligibility.max_income.toLocaleString()} per annum` : 'Not specified'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Age Limit</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {schemeData.eligibility.min_age || schemeData.eligibility.max_age 
                      ? `${schemeData.eligibility.min_age || 'No min'} - ${schemeData.eligibility.max_age || 'No max'} years`
                      : 'Not specified'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Academic Requirement</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {schemeData.eligibility.min_percentage ? `Min ${schemeData.eligibility.min_percentage}%` : 
                     schemeData.eligibility.qualification_requirement || 'As per scheme norms'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Course Requirement</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{schemeData.eligibility.course_requirement || 'As per scheme guidelines'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Institution</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{schemeData.eligibility.institution_requirement || 'Recognized institutions'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Residency</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{schemeData.eligibility.residency_requirement || 'As per state norms'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Admission Mode</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{schemeData.eligibility.admission_requirement || 'As per scheme guidelines'}</dd>
                </div>
              </dl>

              {schemeData.eligibility.other_conditions && (
                <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
                  <span className="font-bold">Additional Conditions:</span>
                  <p className="mt-1">{schemeData.eligibility.other_conditions}</p>
                </div>
              )}
            </div>
          )}

          {/* Benefits Section */}
          {benefits && benefits.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gov-blue-dark mb-4">Benefits</h2>
              <div className="space-y-3">
                {benefits.map((benefit: { id: string; benefit_type: string; description: string | null; amount: number | null; amount_currency: string; amount_period: string | null; coverage: string | null; hosteller_amount: number | null; day_scholar_amount: number | null; conditions: string | null }) => (
                  <Card key={benefit.id} className="p-4 bg-emerald-50 border-emerald-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-800 capitalize">{benefit.benefit_type.replace('_', ' ')}</p>
                        {benefit.description && <p className="mt-1 text-xs text-emerald-700">{benefit.description}</p>}
                        {benefit.conditions && <p className="mt-1 text-xs text-emerald-600">{benefit.conditions}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {benefit.amount ? (
                          <p className="text-lg font-bold text-emerald-700">₹{benefit.amount.toLocaleString()}</p>
                        ) : null}
                        {benefit.hosteller_amount !== null && benefit.day_scholar_amount !== null ? (
                          <div className="text-xs text-emerald-600 mt-1">
                            Hosteller: ₹{benefit.hosteller_amount.toLocaleString()} / Day Scholar: ₹{benefit.day_scholar_amount.toLocaleString()}
                          </div>
                        ) : null}
                        <p className="text-xs text-emerald-600">{benefit.amount_period || 'annual'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="h-fit p-5" accentClass="border-l-4 border-gov-saffron">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application action</p>
          
          {eligibilityEval && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-bold text-emerald-800">Eligibility Assessment</p>
              <p className="mt-1 text-sm text-emerald-700">
                {eligibilityEval.result === 'ELIGIBLE' ? 'You appear to meet the key requirements!' :
                 eligibilityEval.result === 'NOT_ELIGIBLE' ? 'You may not meet critical requirements.' :
                 'Some requirements need verification.'}
              </p>
            </div>
          )}

          <p className="mt-4 text-lg font-bold text-gov-blue-dark">Ready to apply?</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Click below to proceed to the official application portal or view your existing application.
          </p>

          {existingApplication ? (
            <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gov-blue">Existing application</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{existingApplication.id}</span>
                <ApplicationStatusBadge status={existingApplication.status} label={existingApplication.statusLabel} />
              </div>
            </div>
          ) : null}

          {scheme.official_application_url ? (
            <a
              href={scheme.official_application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gov-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gov-blue-dark focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Apply Now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          ) : (
            <Button className="mt-4 w-full" disabled size="md" type="button" variant="primary">
              Apply unavailable
            </Button>
          )}
          
          <Button className="mt-2 w-full" size="md" to={ROUTES.applicant.applications} variant="outline">
            View my applications
          </Button>
        </Card>
      </div>
    </div>
  );
}