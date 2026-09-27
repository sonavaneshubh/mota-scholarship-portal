import { useId, type ReactNode } from 'react';

/**
 * A tab strip following the WAI-ARIA tabs pattern.
 *
 * The scheme detail page is long — overview, eligibility, benefits, documents,
 * process — and stacking all of it makes the page unusable on a phone and
 * tedious to scan on a desktop. Tabs fix that, but only if they are real tabs:
 * a row of buttons that swaps a div is not navigable by keyboard and is
 * invisible to a screen reader, so the roles, `aria-selected` and roving focus
 * are all wired up here rather than left to each call site.
 *
 * The tab order follows the order the `tabs` prop is given, which is the order a
 * reader should work through: what the scheme is, whether they qualify, what
 * they get, what they need to send, and what happens next.
 */

export interface TabDefinition {
  id: string;
  label: string;
  /** Optional count rendered beside the label, e.g. the number of documents. */
  count?: number;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabDefinition[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

export function Tabs({ tabs, activeId, onChange, label }: TabsProps) {
  const baseId = useId();

  /**
   * Arrow-key navigation, per the ARIA pattern. Only the arrow keys and
   * Home/End move between tabs; Tab itself must still leave the tab strip, or
   * a keyboard user would be trapped in it.
   */
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = tabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;
    else return;

    event.preventDefault();
    onChange(tabs[nextIndex].id);

    // Focus follows selection, which is what makes the arrow keys feel like
    // they are moving a single control rather than a cursor.
    document.getElementById(`${baseId}-tab-${tabs[nextIndex].id}`)?.focus();
  }

  return (
    <div>
      <div
        aria-label={label}
        className="flex flex-wrap gap-1 border-b border-slate-200"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          return (
            <button
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-selected={isActive}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                isActive
                  ? 'border-gov-saffron text-gov-blue-dark'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
              id={`${baseId}-tab-${tab.id}`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-gov-saffron text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          className={tab.id === activeId ? 'pt-5' : 'hidden'}
          id={`${baseId}-panel-${tab.id}`}
          key={tab.id}
          role="tabpanel"
          tabIndex={0}
        >
          {/* Rendered for every tab so switching back does not refetch or lose
              scroll position, but hidden panels stay out of the accessibility
              tree and the tab order. */}
          {tab.content}
        </div>
      ))}
    </div>
  );
}
