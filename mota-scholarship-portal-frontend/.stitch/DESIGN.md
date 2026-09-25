# DESIGN — MoTA Scholarship Portal (from Stitch)

> Extracted from the canonical Stitch Home screen (`125adf3111df4fcb84d125927bcc6245`) and its design system ("Rashtriya Janjatiya Seva"). The React/Tailwind tokens below mirror the generated Stitch HTML.

## Brand

Authentic modern Indian government service portal — **institutional, sovereign, dignified, approachable**. Bilingual (Hindi/English), accessibility-first (WCAG + GIGW flavour), information-dense but legible. **Do not** restyle toward a SaaS dashboard, startup landing page, generic AI site, futuristic AI interface, or dark mode.

## Color tokens

| Token | Code (Stitch HTML) | Design-system variant | Usage |
| --- | --- | --- | --- |
| `gov-blue` | `#0b3b75` | `#0a3a78` | mastheads, nav, primary actions |
| `gov-blue-dark` | `#082c59` | `#082f63` | active nav, hovers, hero gradient |
| `gov-blue-light` | `#1e40af` | `#1b4984` | nav hover |
| `gov-blue-ultralight` | `#eff6ff` | — | tints |
| `gov-saffron` | `#c2610c` | `#b45309` | accents, urgent notices |
| `gov-saffron-dark` | `#9a3412` | `#6e3900` | eyebrow text |
| `gov-saffron-light` | `#f59e0b` | `#d97706` | highlight |
| `gov-green` | `#15803d` | `#15803d` | verified status, success |
| `gov-green-dark` | `#166534` | — | hover |
| `gov-green-surface` | `#f0fdf4` | — | success chip fill |
| `gov-slate-bg` | `#f8fafc` | `#f8fafc` | page background |
| `gov-slate-border` | `#cbd5e1` | `#cbd5e1` | borders/dividers |
| `gov-slate-muted` | `#64748b` | `#475569` | muted text |
| Tricolor | `#FF9933` / `#FFFFFF` / `#138808` | — | 4px top strip, equity accents |
| Purple (grievance) | default Tailwind `purple-700` | — | grievance-only UI |

Semantic status chips (from design system): Pending `#fef3c7`/`#92400e`; Approved `#dcfce7`/`#166534`; Clarification `#fee2e2`/`#991b1b`.

## Typography

- Font stack: `Segoe UI, Roboto, Arial, sans-serif` (system — no webfont downloads).
- Headlines: bold navy; Hero uses `text-2xl md:text-4xl font-extrabold`.
- Section headings: `text-xl md:text-2xl font-bold text-gov-blue-dark`.
- Eyebrow labels: `text-xs font-bold uppercase tracking-wider text-gov-saffron`.
- Body: `text-sm` / `text-xs` slate scale.
- Metadata: `text-[10px]` / `text-[11px]` utilities.

## Spacing & layout

- Fixed max-width container `max-w-7xl` (1280px) with `px-4`.
- Section rhythm: `py-8` (hero) → `py-10` (alt slate) → `py-12` (workflow).
- Tiles/cards: `p-4` / `p-5` / `p-6`; grid `gap-4` / `gap-5` / `gap-6`.
- 12-column grids: `lg:grid-cols-12` with `col-span-8` / `col-span-4` splits (hero, about, how-to-apply).
- Element radii: 4px (`rounded`) for buttons/inputs, `rounded-lg` (8px) for cards, `rounded-full` for pills/circles.
- Focus rings: `2px solid #c2610c`, offset 2px (custom CSS).

## Elevation

Crisp 1px borders (`slate-200`/`slate-300`) + light shadows (`shadow-sm`); hero uses gradient `from-gov-blue-dark via-gov-blue to-slate-900` with a dot-pattern overlay and `border-b-4 border-amber-500`.

## Components

1. **Top bar:** tricolor 4px strip; `bg-slate-100` utility row — skip link, Government of India / MoTA bilingual line, font resizer (A- A A+), Contrast toggle, MeriPehchan/DigiLocker badge, language `<select>`.
2. **Masthead:** white bar; SVG State-Emblem placeholder, bilingual MoTA title + NTSFMS subtitle, central "75th Azadi Ka Amrit Mahotsav / VIKSIT BHARAT @2047", right helpdesk (1800-11-7777) + Portal Sign In (navy) / Track Application (outline) buttons.
3. **Nav:** sticky navy bar; Home active (amber underline), sections, amber "New Student Registration" + emerald "DigiLocker Access" badges.
4. **Ticker:** amber-50 marquee, pulsing "Latest Notices" chip, "★" items. (Marquee = custom CSS keyframes, `flex w-max` + two copies, translateX(-50%).)
5. **Hero:** badge, "JANJATIYA GARIMA UTSAV 2026" heading, subtitle, body, 3 CTAs (amber solid / white ghost / emerald outline); right "Leadership & Governance" white card with 2 dignitary frames + national tagline quote.
6. **Quick tiles:** 4 white cards, 4px `border-t-4` accents (blue/saffron/green/purple), icon square, title/desc, link; Track tile embeds Application ID input + Go.
7. **Schemes:** slate band; filter tabs (All 4 / Doctoral / Top Class / Overseas); 4 cards with category badge, status dot, description, 3 stat rows, Guidelines link + Apply Now.
8. **AI workflow:** 4 steps (DigiLocker → AI Pre-Screening "Assistance Only" → Nodal Officer → Ministry Sanction & DBT) with numbered circles + note chips; ethics callout banner.
9. **How to apply:** 4 phase rows; **University corner:** mock officer login form (AISHE code, password) + manual links.
10. **Initiatives strip:** slate band, 6 bordered partner pill placeholders (colored dots, no official logos).
11. **Footer:** `bg-gov-blue-dark`; 4 link columns; bottom slate-950 bar — "Content Managed by MoTA / Designed by NIC", STQC + WCAG 2.0 AA chip, last-updated, portal version.

## Responsive behavior

- Base = desktop-first from Stitch; collapse at `lg` (1024) and `md` (768).
- Nav: desktop horizontal list + badges; mobile hamburger opens an accessible drawer (all items stack).
- Hero: 12-col → single column (`lg:grid-cols-12` then `grid-cols-1`); leadership card below content on mobile.
- Tiles: 4 → 2 (`sm`) → 1 columns.
- Scheme grid: 4 → 2 (`md`) → 1.
- Masthead center block hidden < `lg`; helpdesk hidden < `sm`; DigiLocker badge hidden < `md`.
- Cards stack; typography stays on the `text-xs`–`text-lg` scale; no horizontal overflow (verified at 320–2560px).

## File references

- Stitch HTML extraction: saved locally under `Temp/opencode/stitch/home.html` (dev machine only).
- Design-system asset: `assets/6dc4c9bb468e42d7a69aaff28524fbde`.