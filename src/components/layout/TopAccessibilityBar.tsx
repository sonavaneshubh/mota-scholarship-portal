import { useEffect, useState } from 'react';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  LANGUAGES,
  SECTION_IDS,
  SITE,
} from '../../lib/constants';
import type { LanguageOption } from '../../types';

export function TopAccessibilityBar() {
  const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
  const [contrast, setContrast] = useState(false);
  const [lang, setLang] = useState<LanguageOption>(LANGUAGES[0]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 16}px`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', contrast);
    return () => document.documentElement.classList.remove('high-contrast');
  }, [contrast]);

  const increaseFont = () =>
    setFontScale((s) => Math.min(s + FONT_SCALE_STEP, FONT_SCALE_MAX));
  const decreaseFont = () =>
    setFontScale((s) => Math.max(s - FONT_SCALE_STEP, FONT_SCALE_MIN));
  const resetFont = () => setFontScale(DEFAULT_FONT_SCALE);

  return (
    <header id={SECTION_IDS.TOP.replace('#', '')} className="w-full bg-slate-100 border-b border-slate-300 text-xs text-slate-700" role="banner">
      <div aria-hidden="true" className="tricolor-strip w-full" />
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-4">
          <a
            className="skip-link sr-only focus:not-sr-only focus:bg-amber-100 focus:text-slate-900 focus:p-1 font-semibold"
            href={SECTION_IDS.MAIN_CONTENT}
          >
            Skip to Main Content
          </a>
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-gov-green" />
            {SITE.govtLineHi} | {SITE.govtLineEn}
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-600">
            {SITE.nameHi} | {SITE.nameEn}
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div
            className="flex items-center border border-slate-300 rounded bg-white overflow-hidden px-1"
            title="Accessibility Font Adjust"
          >
            <button
              aria-label="Decrease Font Size"
              className="px-1.5 py-0.5 hover:bg-slate-100 border-r border-slate-200 font-bold text-xs"
              type="button"
              onClick={decreaseFont}
            >
              A-
            </button>
            <button
              aria-label="Default Font Size"
              className="px-1.5 py-0.5 hover:bg-slate-100 border-r border-slate-200 font-bold text-xs"
              type="button"
              onClick={resetFont}
            >
              A
            </button>
            <button
              aria-label="Increase Font Size"
              className="px-1.5 py-0.5 hover:bg-slate-100 font-bold text-xs"
              type="button"
              onClick={increaseFont}
            >
              A+
            </button>
          </div>

          <button
            className="border border-slate-300 rounded bg-white px-2 py-0.5 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
            title="High Contrast Mode"
            type="button"
            onClick={() => setContrast((c) => !c)}
            aria-pressed={contrast}
          >
            <span className="w-2.5 h-2.5 bg-black rounded-full border border-white" />
            Contrast
          </button>

          <div className="hidden md:flex items-center gap-1 text-slate-600 border-l border-slate-300 pl-3">
            <svg className="w-3.5 h-3.5 text-blue-700" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                clipRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                fillRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-slate-700">Accessible • Keyboard &amp; Screen-Reader Friendly</span>
          </div>

          <div className="border-l border-slate-300 pl-3">
            <select
              aria-label="Select Language"
              className="py-0.5 pl-2 pr-6 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-gov-blue"
              value={lang.code}
              onChange={(e) => {
                const next = LANGUAGES.find((l) => l.code === e.target.value) ?? LANGUAGES[0];
                setLang(next);
              }}
            >
              {LANGUAGES.map((option: LanguageOption) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}