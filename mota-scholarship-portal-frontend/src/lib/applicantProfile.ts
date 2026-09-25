import type { ApplicantProfile } from '../types';

const PROFILE_SECTIONS = [
  {
    id: 'personal',
    label: 'Personal & contact',
    fields: ['name', 'email', 'mobile'] as const,
  },
  {
    id: 'location',
    label: 'Location & category',
    fields: ['state', 'district', 'category'] as const,
  },
  {
    id: 'academic',
    label: 'Academic details',
    fields: ['course', 'institution'] as const,
  },
] satisfies ReadonlyArray<{
  id: string;
  label: string;
  fields: ReadonlyArray<keyof ApplicantProfile>;
}>;

export interface ProfileSectionStatus {
  id: string;
  label: string;
  completed: number;
  total: number;
  complete: boolean;
}

export function calculateApplicantProfileCompletion(profile: ApplicantProfile) {
  const fields = PROFILE_SECTIONS.flatMap((section) => section.fields);
  const completed = fields.filter((field) => profile[field].trim().length > 0).length;

  return Math.round((completed / fields.length) * 100);
}

export function getApplicantProfileSections(profile: ApplicantProfile): ProfileSectionStatus[] {
  return PROFILE_SECTIONS.map((section) => {
    const completed = section.fields.filter((field) => profile[field].trim().length > 0).length;

    return {
      id: section.id,
      label: section.label,
      completed,
      total: section.fields.length,
      complete: completed === section.fields.length,
    };
  });
}
