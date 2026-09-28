export type AdminRole = 'Super Admin' | 'Admin' | 'Verifier' | 'Reviewer' | 'Demo Admin';

export type AdminUserStatus = 'Active' | 'Inactive';

export type AdminApplicationStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Documents Required';

export type AdminDocumentStatus =
  | 'Uploaded'
  | 'Under Verification'
  | 'Verified'
  | 'Rejected'
  | 'Re-upload Requested';

export interface AdminUser {
  id: string;
  adminId: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminUserStatus;
  lastLogin: string;
  initials: string;
}

/**
 * `prototype` is the pre-existing offline admin shell, signed in with the
 * hardcoded development credentials. It reaches screens that are not connected
 * to live data, and nothing on the applicant -> submitted application -> admin
 * path.
 *
 * `demo` is the Demo Admin: a real Supabase account holding the read-only
 * `demo_admin` role. The distinction is kept in the session rather than inferred,
 * so a page never has to guess whether it is showing live rows.
 */
export type AdminSessionMode = 'prototype' | 'demo';

export interface AdminSession {
  user: AdminUser;
  signedInAt: string;
  remember: boolean;
  /** Absent on sessions stored before the Demo Admin existed; treated as 'prototype'. */
  mode?: AdminSessionMode;
}

export interface AdminAuthResult {
  ok: boolean;
  user?: AdminUser;
  message?: string;
  /**
   * Set on a failed one-click Demo sign-in. True when the failure is a
   * deployment problem (the broker is not deployed or not configured) and the
   * manual credential form is therefore still worth offering; false when the
   * cause is a misconfigured account, which typing cannot fix.
   */
  canRetryWithCredentials?: boolean;
}

export interface AdminDocument {
  id: string;
  applicationId: string;
  name: string;
  fileName: string;
  status: AdminDocumentStatus;
  uploadedAt: string;
  updatedAt: string;
  required: boolean;
  /**
   * Path inside the private applicant storage bucket. Kept so a read-only viewer
   * can mint a short-lived signed URL for the real file instead of faking a
   * preview. Never a public URL, and never the applicant auth id on its own.
   */
  storagePath?: string | null;
  rejectionReason?: string;
}

export interface AdminApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  category: string;
  address: string;
  college: string;
  course: string;
  academicYear: string;
  enrollmentNumber: string;
  previousResult: string;
  schemeId: string;
  schemeName: string;
  /** Human-facing scheme identifier from `schemes.scheme_code`. */
  schemeCode?: string;
  schemeStatus?: string;
  schemeAcademicYear?: string;
  /** Whether the scheme supports renewal, from `schemes.renewal_available`. */
  renewalAvailable?: boolean;
  applicationDate: string;
  status: AdminApplicationStatus;
  amount: number;
  documentStatus: 'Complete' | 'Pending Verification' | 'Documents Required';
  documents: AdminDocument[];
  rejectionReason?: string;
  lastActivity: string;
  /**
   * ISO timestamp of the submit itself. Distinct from `applicationDate`, which
   * the list uses as a bare date for sorting and display.
   */
  submittedAt?: string;
  declarationAccepted?: boolean;
  eligibilityResult?: unknown;
  /** `applications.scheme_answers` verbatim: the scheme-specific form answers. */
  schemeAnswers?: Record<string, unknown> | null;
  draftSavedAt?: string;
}

export interface AdminApplicant {
  id: string;
  name: string;
  email: string;
  mobile: string;
  category: string;
  college: string;
  course: string;
  state: string;
  applicationCount: number;
  latestStatus: AdminApplicationStatus;
}

export interface AdminScheme {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  category: string;
  academicRequirements: string;
  incomeLimit: string;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Inactive';
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'application' | 'document' | 'payment' | 'scheme' | 'system';
  href: string;
}

export interface AdminActivity {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  tone: 'blue' | 'amber' | 'green' | 'slate';
}

export interface DashboardStats {
  totalApplicants: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  documentsPendingVerification: number;
  scholarshipsDisbursed: number;
  totalAmountDisbursed: number;
}

export interface MonthlyApplicationData {
  month: string;
  applications: number;
  approved: number;
}

export interface CategoryApplicationData {
  category: string;
  applications: number;
  percentage: number;
  tone: 'blue' | 'saffron' | 'green' | 'purple' | 'slate';
}

export interface CollegeApplicationData {
  college: string;
  applications: number;
  approved: number;
}

export interface ScholarshipDistributionData {
  name: string;
  applicants: number;
  amount: number;
  percentage: number;
}
