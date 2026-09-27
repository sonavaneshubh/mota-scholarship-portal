-- =============================================================================
-- Populate scheme guideline URLs (Download GRs)
-- =============================================================================
-- The Download GRs column on the applicant schemes table is driven by
-- public.schemes.gr_url, which the master-data sync seeds as NULL. That left
-- every scheme showing "Not available".
--
-- The guideline PDFs are bundled with the frontend under
-- mota-scholarship-portal-frontend/public/guidelines/ and are served from the
-- site root, so gr_url stores a root-relative path.
--
-- Frontend fallback: src/data/schemeGuidelines.ts maps scheme_code to the same
-- bundled files, so downloads work even before this migration is applied. Once
-- it is applied the database becomes the source of truth.
--
-- A023B (Top Class Education For ST Students) is intentionally left NULL: no
-- genuine document was supplied for it. The file provided was byte-identical
-- to the National Fellowship PDF (md5 087ffc34b4fd...), so linking it would
-- publish an official document under the wrong scheme name. Add a row here
-- once the real guideline is available.

-- =============================================================================
-- Preconditions
-- =============================================================================
DO $$
DECLARE
    missing text;
BEGIN
    SELECT string_agg(expected, ', ')
      INTO missing
      FROM unnest(ARRAY['BVOBC', 'BPVGK', 'ARG45', 'AZKMI']) AS expected
     WHERE NOT EXISTS (
        SELECT 1 FROM public.schemes s WHERE s.scheme_code = expected
     );

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION
            'Cannot populate gr_url: scheme codes missing from public.schemes: %',
            missing;
    END IF;
END $$;

-- =============================================================================
-- Apply the guideline URLs
-- =============================================================================
-- The gr_url IS NULL guard means this never clobbers an administrator who has
-- already pointed gr_url at an externally hosted copy of the document.
UPDATE public.schemes
SET gr_url = CASE scheme_code
        WHEN 'BPVGK' THEN '/guidelines/pre-matric-scholarship.pdf'
        WHEN 'BVOBC' THEN '/guidelines/post-matric-scholarship.pdf'
        WHEN 'ARG45' THEN '/guidelines/national-fellowship-scholarship.pdf'
        WHEN 'AZKMI' THEN '/guidelines/national-overseas-scholarship.pdf'
    END,
    updated_at = now()
WHERE scheme_code IN ('BPVGK', 'BVOBC', 'ARG45', 'AZKMI')
  AND gr_url IS NULL;

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
DECLARE
    still_null text;
BEGIN
    SELECT string_agg(scheme_code, ', ')
      INTO still_null
      FROM public.schemes
     WHERE scheme_code IN ('BPVGK', 'BVOBC', 'ARG45', 'AZKMI')
       AND gr_url IS NULL;

    IF still_null IS NOT NULL THEN
        RAISE EXCEPTION 'gr_url still NULL after migration for: %', still_null;
    END IF;

    RAISE NOTICE 'Download GRs populated for 4 schemes. A023B left NULL (no document supplied).';
END $$;
