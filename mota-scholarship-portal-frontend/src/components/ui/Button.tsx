import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'outline' | 'accent' | 'success' | 'ghost' | 'emerald' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export type ButtonProps = BaseProps &
  (
    | (Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
        href?: never;
        to?: never;
      })
    | (Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
        href: string;
        to?: never;
      })
    | (Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
        href?: never;
        to: string;
      })
  );

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gov-blue text-white hover:bg-gov-blue-dark shadow transition',
  outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition',
  accent: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded shadow transition',
  success: 'bg-emerald-700 hover:bg-emerald-800 text-white rounded border border-emerald-500 transition',
  ghost:
    'bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/30 backdrop-blur transition',
  emerald: 'bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-600 transition',
  // For a confirmed destructive action only — never a row-level one, so it is
  // always the thing a dialog made the applicant choose on purpose.
  danger: 'bg-red-700 hover:bg-red-800 text-white border border-red-800 transition',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs font-semibold',
  md: 'px-3 py-1.5 text-xs font-semibold',
  lg: 'px-5 py-2.5 text-sm',
};

function resolveClass(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return `inline-flex items-center justify-center gap-1.5 ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ''}`;
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className, children, ...rest } = props;

  if (props.to !== undefined) {
    return (
      <Link
        to={props.to}
        className={resolveClass(variant, size, className)}
        {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href' | 'to'>)}
      >
        {children}
      </Link>
    );
  }

  if (props.href !== undefined) {
    return (
      <a
        href={props.href}
        className={resolveClass(variant, size, className)}
        {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>)}
      >
        {children}
      </a>
    );
  }

  const buttonProps = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;
  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? 'button'}
      className={resolveClass(variant, size, className)}
    >
      {children}
    </button>
  );
}