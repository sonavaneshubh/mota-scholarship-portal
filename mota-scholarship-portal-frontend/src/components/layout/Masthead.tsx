import { SITE } from '../../lib/constants';
import logo from '../../assets/logo.png';

export function Masthead() {
  return (
    <header className="masthead-gradient relative border-b border-slate-200 shadow-sm">
      {/* No horizontal padding on this wrapper on purpose: the 24px left and
          20px right insets are owned by the left and right sections in
          index.css, so container padding would silently add to them. */}
      <div className="mx-auto max-w-full">
        {/*
          Three sections in one CSS Grid row: [branding] [title] [logos].
          The track template in index.css is minmax(0,1fr) auto minmax(0,1fr),
          which is what keeps the title dead centre - the two outer tracks are
          equal, so the title cannot be pushed off centre by the branding or the
          logo group getting wider. It used to be four flex columns with
          space-between, which put the title 40px left of centre at 1280px.

          Every dimension lives in index.css as a custom property on
          .masthead-hero; nothing here sets a size. Which assets are visible at
          which width is a markup concern, so the responsive breakpoints sit on
          the elements themselves.
        */}
        <div className="masthead-hero">
          {/* Section 1 - GoI emblem + ministry branding. */}
          <div className="masthead-left">
            {/* The wrapper is a plain flex-shrink:0 box. The emblem's own
                negative inline margins (see .masthead-emblem) reclaim the
                19.4% transparent padding on each side of this 469x532 asset,
                so the wrapper ends up exactly as wide as the VISIBLE emblem. */}
            <div className="relative flex-shrink-0">
              <img
                src={logo}
                alt="Government of India Emblem"
                className="masthead-emblem"
              />
            </div>
            <div className="min-w-0">
              {/* leading-[1.2] on the two 10px lines trims their line boxes from
                  15px to 12px. Font SIZE, weight, colour and letter-spacing are
                  unchanged - only the leading. The four-line branding block is
                  the tallest fixed element in the header at 67.5px, so it, not
                  the portrait, is what sets the floor for --hero-h; tightening
                  it is what lets the whole section come down. */}
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase leading-[1.2] tracking-wider text-slate-600">
                <span>{SITE.govtLineHi}</span>
                <span className="text-slate-400">|</span>
                <span>{SITE.govtLineEn}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-gov-blue-dark">{SITE.nameHi}</h1>
              <div className="text-sm font-semibold leading-tight text-slate-800">{SITE.nameEn}</div>
              <div className="text-[10px] font-medium leading-[1.2] text-gov-saffron-dark">{SITE.portalName}</div>
            </div>
          </div>

          {/* Section 2 - the portal title, the visual centre of the header.
              Serif-style weight kept as-is: the existing dark-blue Poppins
              treatment, unchanged.

              Hidden below xl (1280px), the same breakpoint as the two
              wordmarks. That is deliberate: the full three-section header only
              works when all three sections coexist. Measured at 1024px, the
              centre track came out 307px against 331px of branding content, so
              the "AI-Enabled Scholarship & Fellowship Management System" line
              wrapped to two lines - a squeezed band where the title was
              present but the logo pair was not. Dropping the title below 1280
              leaves two comfortable tracks of ~632px each instead. */}
          <div className="masthead-center hidden xl:block">
            <span
              className="text-[18px] font-bold uppercase leading-snug tracking-[0.04em] text-gov-blue-dark"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              National Tribal
              <br />
              Fellowship &amp; Scholarship Portal
            </span>
          </div>

          {/* Section 3 - G20, Azadi Ka Amrit Mahotsav and the PM portrait as
              one optically centred group. The two wordmarks are hidden below
              xl (1280px): together they need 217px, which stops fitting beside
              the ministry block and the title at narrower widths. The portrait
              is hidden below sm. */}
          <div className="masthead-right">
            <img
              src="/images/g20-logo.png"
              alt="G20 Presidency of India logo"
              className="masthead-logo-g20 hidden xl:block"
            />
            <img
              src="/images/azadi75.png"
              alt="Azadi Ka Amrit Mahotsav logo"
              className="masthead-logo-azadi hidden xl:block"
            />
            <img
              src="/images/modi.png"
              alt="Shri Narendra Modi, Prime Minister of India"
              className="masthead-portrait hidden sm:block"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
