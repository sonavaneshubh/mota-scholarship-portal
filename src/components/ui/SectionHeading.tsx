import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  eyebrow?: string;
  eyebrowTone?: 'saffron' | 'blue';
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  eyebrowTone = 'saffron',
  title,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  const alignClass =
    align === 'center' ? 'text-center max-w-3xl mx-auto mb-8' : 'mb-6';
  const eyebrowClass =
    eyebrowTone === 'blue'
      ? 'text-gov-blue uppercase tracking-wider bg-blue-50 border border-blue-200 px-2.5 py-1 rounded'
      : 'text-gov-saffron uppercase tracking-wider';

  return (
    <div className={`${alignClass} ${className}`}>
      {eyebrow ? (
        <span className={`text-xs font-bold ${eyebrowClass}`}>{eyebrow}</span>
      ) : null}
      <h2 className="text-xl md:text-2xl font-bold text-gov-blue-dark mt-2">{title}</h2>
      {description ? (
        <p className="text-xs md:text-sm text-slate-600 mt-1">{description}</p>
      ) : null}
    </div>
  );
}