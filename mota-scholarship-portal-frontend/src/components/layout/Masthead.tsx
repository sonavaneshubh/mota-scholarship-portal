import { SITE } from '../../lib/constants';
import logo from '../../assets/logo.png';

export function Masthead() {
  return (
    <header className="masthead-gradient relative border-b border-slate-200 shadow-sm">
      {/* No horizontal padding here on purpose: the 32px left and 20px right
          insets are owned by columns 1 and 4, so container padding would
          silently add to the edge spacing the spec asks for. */}
      <div className="mx-auto max-w-full">
        {/*
          Four balanced columns in a single flex row, per spec.
          Sizing, spacing and the portrait/nav gap all live in index.css
          (.masthead-col-*); nothing here sets a dimension.

            1. identity  32% cap  emblem + ministry text
            2. title     22% cap  NATIONAL TRIBAL FELLOWSHIP / SCHOLARSHIP PORTAL
            3. logos     26% cap  G20 + Azadi Ka Amrit Mahotsav
            4. portrait  20% cap  Modi, bottom-right

          The columns are content-sized and capped at those percentages, so
          justify-content: space-between (set in CSS) spreads the leftover
          width evenly and all three inter-column gaps come out equal. If they
          were flex-basis percentages instead they would total 100%, leaving
          space-between nothing to distribute and the gaps would be accidental
          leftovers of each column's alignment - visibly uneven.
        */}
        <div className="masthead-hero">
          {/* Column 1 - government emblem + ministry text */}
          <div className="masthead-col masthead-col-identity">
            <div className="relative flex-shrink-0">
              <img
                src={logo}
                alt="Government of India Emblem"
                className="masthead-emblem"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                <span>{SITE.govtLineHi}</span>
                <span className="text-slate-400">|</span>
                <span>{SITE.govtLineEn}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-gov-blue-dark">{SITE.nameHi}</h1>
              <div className="text-sm font-semibold leading-tight text-slate-800">{SITE.nameEn}</div>
              <div className="text-[10px] font-medium text-gov-saffron-dark">{SITE.portalName}</div>
            </div>
          </div>

          {/* Column 2 - portal title, centred on both axes, on ONE row.
              Serif (Georgia/Cambria) rather than the page sans, so the title
              reads as a title instead of blending into the ministry text next
              to it. The two phrases are separated by a middot rather than run
              together, because a single 41-character uppercase serif run is
              genuinely hard to parse without a visible phrase break.

              This column carries no max-width cap (unlike columns 1, 3 and 4).
              The 22% it was previously capped at came from the four-column
              split, but a one-line title needs ~402px at 13px, which the 22%
              cap - 282px at 1280px - would have forced to wrap. Nothing here
              uses flex-grow, so dropping the cap simply lets the column size
              to its content; the leftover width still goes to space-between. */}
          <div className="masthead-col masthead-col-title hidden lg:flex">
            <span className="text-[18px] font-bold uppercase leading-snug tracking-[0.04em] text-gov-blue-dark text-center" style={{ fontFamily: "'Poppins', sans-serif" }}>
              National Tribal
              <br />
              Fellowship &amp; Scholarship Portal
            </span>
          </div>

          {/* Column 3 - G20 + Azadi Ka Amrit Mahotsav, side by side.
              Dropped below 1280px: the pair needs 342px and stops fitting. */}
          <div className="masthead-col masthead-col-logos hidden xl:flex">
            <img
              src="/images/g20-logo.png"
              alt="G20 Presidency of India logo"
              className="masthead-logo-g20"
            />
            <img
              src="/images/azadi75.png"
              alt="Azadi Ka Amrit Mahotsav logo"
              className="masthead-logo-azadi"
            />
          </div>

          {/* Column 4 - PM portrait, bottom-right, 6px clear of the nav bar */}
          <div className="masthead-col masthead-col-portrait hidden sm:flex">
            <img
              src="/images/modi.png"
              alt="Shri Narendra Modi, Prime Minister of India"
              className="masthead-portrait"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
