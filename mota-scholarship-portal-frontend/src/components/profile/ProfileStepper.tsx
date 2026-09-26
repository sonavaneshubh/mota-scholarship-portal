/**
 * Section stepper.
 *
 * Implemented as an ordered list rather than a tab widget so that a keyboard or
 * screen-reader user can perceive the sections as steps, and each button carries
 * aria-current when it is the active step. Completion state is a plain badge, not
 * colour alone.
 */

import { Badge } from '../ui/Badge';
import type { ProfileSectionId } from '../../types/profile';

export interface StepperSection {
  id: ProfileSectionId;
  label: string;
  percent: number;
}

interface ProfileStepperProps {
  sections: StepperSection[];
  active: ProfileSectionId;
  onSelect: (id: ProfileSectionId) => void;
}

export function ProfileStepper({ sections, active, onSelect }: ProfileStepperProps) {
  return (
    <nav aria-label="Profile sections" className="w-full">
      <ol className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-stretch">
        {sections.map((section, index) => {
          const isActive = section.id === active;
          const isComplete = section.percent >= 100;

          return (
            <li className="min-w-0 flex-1" key={section.id}>
              <button
                aria-current={isActive ? 'step' : undefined}
                className={`flex w-full items-center gap-2 rounded border px-2.5 py-2 text-left transition ${
                  isActive
                    ? 'border-gov-blue bg-gov-blue-ultralight shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => onSelect(section.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isComplete
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-gov-blue text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isComplete ? '✓' : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[12px] font-semibold ${
                      isActive ? 'text-gov-blue-dark' : 'text-slate-700'
                    }`}
                  >
                    {section.label}
                  </span>
                </span>
                <Badge tone={isComplete ? 'emerald' : 'slate'}>{section.percent}%</Badge>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
