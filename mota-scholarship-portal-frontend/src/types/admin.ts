export type AdminRole = 'Super Admin' | 'Admin' | 'Verifier' | 'Reviewer';

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

export interface AdminSession {
  user: AdminUser;
  signedInAt: string;
  remember: boolean;
}

export interface AdminAuthResult {
  ok: boolean;
  user?: AdminUser;
  message?: string;
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
  applicationDate: string;
  status: AdminApplicationStatus;
  amount: number;
  documentStatus: 'Complete' | 'Pending Verification' | 'Documents Required';
  documents: AdminDocument[];
  rejectionReason?: string;
  lastActivity: string;
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
