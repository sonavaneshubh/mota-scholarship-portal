/**
 * Official MoTA scheme guidelines, served as static PDFs from
 * /guidelines/ in the public folder.
 *
 * The `code` values are the scheme codes used by the scholarship master data
 * (see the sync_scholarship_master_data migration), so a guideline can be
 * joined to its scheme record without a second lookup table.
 *
 * Page counts and scheme periods below were read off the supplied documents,
 * not inferred from the file names.
 *
 * Note: "Top Class Education For ST Students" (A023B) has no entry here. The
 * supplied file for it was byte-identical to the National Fellowship PDF, so
 * it was dropped rather than published under a second, incorrect name. Add it
 * back once the real document is available.
 */
export interface SchemeGuideline {
  /** Master-data scheme code, e.g. 'ARG45'. */
  code: string;
  title: string;
  /** Public URL of the PDF. */
  href: string;
  /** Pre-formatted size, kept as a string so it is not recomputed per render. */
  fileSize: string;
  /** Page count, verified against the source document. */
  pages: number;
  /** Scheme period printed on the document cover. */
  schemePeriod: string;
}

/** Every guideline supplied so far covers this same, now-ended scheme period. */
const SCHEME_PERIOD = '2021-22 to 2025-26';

export const SCHEME_GUIDELINES: SchemeGuideline[] = [
  {
    code: 'BPVGK',
    title: 'Pre-Matric Scholarship Scheme For ST Student',
    href: '/guidelines/pre-matric-scholarship.pdf',
    fileSize: '0.59 MB',
    pages: 12,
    schemePeriod: SCHEME_PERIOD,
  },
  {
    code: 'BVOBC',
    title: 'Post-Matric Scholarship Scheme For ST Students',
    href: '/guidelines/post-matric-scholarship.pdf',
    fileSize: '0.58 MB',
    pages: 19,
    schemePeriod: SCHEME_PERIOD,
  },
  {
    code: 'ARG45',
    title: 'National Fellowship for ST Students',
    href: '/guidelines/national-fellowship-scholarship.pdf',
    fileSize: '3.95 MB',
    pages: 38,
    schemePeriod: SCHEME_PERIOD,
  },
  {
    code: 'AZKMI',
    title: 'National Overseas Scholarship Scheme',
    href: '/guidelines/national-overseas-scholarship.pdf',
    fileSize: '0.60 MB',
    pages: 11,
    schemePeriod: SCHEME_PERIOD,
  },
];

/**
 * The financial year the portal is currently in. Bump this once per year, or
 * replace it with a value from the master data, to drive the expiry notice.
 */
const CURRENT_FINANCIAL_YEAR = 2026;

/** Last year covered by a "2021-22 to 2025-26" style period, as a number. */
function periodEndYear(period: string): number | null {
  const match = /to\s+(\d{4})\s*-\s*(\d{2})/.exec(period);
  return match ? Number(match[1]) : null;
}

/**
 * True when every guideline on show has a scheme period that has already
 * ended. The home page renders a notice in that case rather than presenting
 * the documents as the current rules.
 */
export const ALL_GUIDELINES_ARE_SUPERSEDED = SCHEME_GUIDELINES.every((guideline) => {
  const endYear = periodEndYear(guideline.schemePeriod);
  return endYear !== null && endYear < CURRENT_FINANCIAL_YEAR;
});

const GUIDELINE_BY_SCHEME_CODE: Record<string, SchemeGuideline> = Object.fromEntries(
  SCHEME_GUIDELINES.map((guideline) => [guideline.code, guideline]),
);

/**
 * Resolves the guideline download URL for a scheme.
 *
 * `schemes.gr_url` in the database is the source of truth and may point at an
 * externally hosted document. It is seeded as NULL, so these locally bundled
 * PDFs act as the fallback for the schemes we ship a document for. Once the
 * column is populated the database value wins and the bundled copy is only
 * used for schemes that still have no `gr_url`.
 *
 * Returns an empty string when neither source has a document, which callers
 * treat as "no download available".
 */
export function resolveGuidelineUrl(
  dbUrl: string | null | undefined,
  schemeCode: string | null | undefined,
): string {
  const trimmed = dbUrl?.trim();
  if (trimmed) return trimmed;
  if (!schemeCode) return '';
  return GUIDELINE_BY_SCHEME_CODE[schemeCode]?.href ?? '';
}
