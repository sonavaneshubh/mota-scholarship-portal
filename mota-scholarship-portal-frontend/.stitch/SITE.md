# SITE — MoTA Scholarship & Fellowship Management System

> Reference documentation for the UI foundation of the **AI-Enabled Scholarship & Fellowship Management System for the Ministry of Tribal Affairs (MoTA), Government of India**.

## Canonical Stitch Reference

| Key | Value |
| --- | --- |
| Stitch project ID | `11437332502158775876` |
| Stitch project title | Tribal Scholarship Management Portal |
| Canonical Home screen ID | `125adf3111df4fcb84d125927bcc6245` |
| Home screen title | MoTA - AI-Enabled Scholarship & Fellowship Management System (Home) |
| Screen device type / size | DESKTOP / 2560 x 6396 |
| Design system asset | `assets/6dc4c9bb468e42d7a69aaff28524fbde` ("Rashtriya Janjatiya Seva") |
| MCP | Stitch (https://stitch.googleapis.com/mcp) via `.vscode/mcp.json` |

**Rule:** the Stitch Home screen is the visual source of truth. The React app reproduces it 1:1. The Stitch project must NOT be modified.

## Tech Stack (foundation only)

- React 18 + TypeScript (strict)
- Vite 5
- Tailwind CSS v3 (custom `gov-*` palette)
- React Router (only the `/` Home route is implemented; sub-routes are declared in `lib/constants.ts` for the future)

**Explicitly out of scope (later phases):** Supabase / PostgreSQL, authentication, OCR, AI APIs, real government APIs, email/SMS, payments.

## Pages

Only one page exists in this milestone:

- `/` — Home (canonical Stitch Home screen)

Future route groups are declared as constants in `src/lib/constants.ts` (APPLICANT_ROUTES, ADMIN_ROUTES) but no pages are scaffolded yet.

## Section order (matches Stitch)

1. Top accessibility bar (tricolor strip, font resize, contrast, language, DigiLocker)
2. Official ministry masthead (emblem, bilingual titling, helpdesk, sign-in)
3. Primary navigation ribbon (sticky, navy)
4. Announcement / news ticker (marquee)
5. Hero banner (tribal heritage + leadership & governance card)
6. Quick action tiles (Find Scheme / Check Eligibility / Track Application / Grievance)
7. About MoTA & News & Circulars
8. Scheme & fellowship directory (filterable 4-card grid)
9. AI-assisted verification workflow (4 steps + ethics callout)
10. How to apply (4 phases) + University & Institute corner (mock officer login)
11. Government initiatives strip (partner placeholders)
12. Government footer (4 columns + NIC hosted bar)

## Component map (Stitch block -> React component)

| Stitch `data-purpose` / block | Component |
| --- | --- |
| TopAccessibilityBar | `components/layout/TopAccessibilityBar.tsx` |
| official-branding-header | `components/layout/Masthead.tsx` |
| MainNavigationBar | `components/layout/MainNavigation.tsx` |
| RunningNewsMarquee | `components/layout/AnnouncementTicker.tsx` |
| hero-banner | `components/home/HeroBanner.tsx` |
| quick-access-tiles | `components/home/QuickAccessTiles.tsx` |
| about-ministry-briefing | `components/home/AboutMinistry.tsx` |
| news/circulars sidebar | `components/home/NewsCirculars.tsx` |
| schemes-fellowships-directory | `components/home/SchemeDirectory.tsx` |
| scheme card | `components/home/SchemeCard.tsx` |
| ai-assisted-governance-workflow | `components/home/GovernanceWorkflow.tsx` |
| how-to-apply-guide | `components/home/HowToApply.tsx` |
| officer-quick-login | `components/home/OfficerQuickLogin.tsx` |
| government-initiatives-strip | `components/home/GovernmentInitiatives.tsx` |
| OfficialGovernmentFooter | `components/layout/Footer.tsx` |
| shared primitives | `components/ui/` (Button, Badge, Card, SectionHeading) |

## Mock data

All display content lives in `src/data/mockData.ts` (structurally typed in `src/types/index.ts`).
It is clearly **prototype / sample data** — to be replaced by API responses in later phases.
No official eligibility criteria or statistics are asserted; values shown are demo placeholders lifted from the Stitch design.