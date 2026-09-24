import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentClass?: string;
  children: ReactNode;
}

export function Card({ accentClass, children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm ${accentClass ?? ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}