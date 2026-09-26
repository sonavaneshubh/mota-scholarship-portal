/**
 * Sample rows for the portal "Suggested Eligible Schemes" table.
 * These mirror the reference design's static prototype dataset and are not
 * live scheme records. Replace with an API response when a backend exists.
 */

export const PORTAL_ACADEMIC_YEAR = '2025-2026';

export interface PortalScheme {
  id: string;
  name: string;
  department: string;
  type: string;
  guidelinesAvailable: boolean;
}

export const PORTAL_SCHEMES: PortalScheme[] = [
  {
    id: 'rajarshi-ebc',
    name: 'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna(EBC)',
    department: 'Directorate of Technical Education',
    type: 'Scholarship',
    guidelinesAvailable: true,
  },
  {
    id: 'deshmukh-dte',
    name: 'Dr Panjabrao Deshmukh Vastigruh Nirvah Bhatta Yojna(DTE)',
    department: 'Directorate of Technical Education',
    type: 'Maintenance Allowance',
    guidelinesAvailable: true,
  },
  {
    id: 'open-merit-junior',
    name: 'Open Merit Scholarships in Junior College',
    department: 'School Education and Sports Department',
    type: 'Scholarship',
    guidelinesAvailable: true,
  },
  {
    id: 'merit-ebc',
    name: 'Merit Scholarships for Economically Backward Class Students',
    department: 'School Education and Sports Department',
    type: 'Scholarship',
    guidelinesAvailable: true,
  },
  {
    id: 'post-matric-vjnt',
    name: 'Post Matric Scholarship to VJNT Students',
    department: 'OBC, SEBC, VJNT & SBC Welfare Department',
    type: 'Scholarship',
    guidelinesAvailable: true,
  },
  {
    id: 'tuition-fees-vjnt',
    name: 'Tuition Fees and Examination Fees to VJNT Students',
    department: 'OBC, SEBC, VJNT & SBC Welfare Department',
    type: 'Scholarship',
    guidelinesAvailable: true,
  },
  {
    id: 'maintenance-vjnt-hostel',
    name: 'Payment of Maintenance Allowance to VJNT and SBC Students Studying in Professional Courses and Living in Hostel Attached to Professional Colleges',
    department: 'OBC, SEBC, VJNT & SBC Welfare Department',
    type: 'Maintenance Allowance',
    guidelinesAvailable: true,
  },
  {
    id: 'rajarshi-merit-11-12',
    name: 'Rajarshi Chhatrapati Shahu Maharaj Merit Scholarship for students studying in 11th & 12th standard of VJNT & SBC category',
    department: 'OBC, SEBC, VJNT & SBC Welfare Department',
    type: 'Scholarship',
    guidelinesAvailable: true,
  },
  {
    id: 'deshmukh-agr',
    name: 'Dr. Panjabrao Deshmukh Vasatigruh Nirvah Bhatta Yojna (AGR)',
    department: 'Mahatma Phule Krishi Vidyapeeth, Rahuri',
    type: 'Maintenance Allowance',
    guidelinesAvailable: true,
  },
  {
    id: 'deshmuh-doa',
    name: 'Dr. Panjabrao Deshmukh Vasatigruh Nirvah Bhatta Yojna (DOA)',
    department: 'Directorate of Art',
    type: 'Maintenance Allowance',
    guidelinesAvailable: true,
  },
];
