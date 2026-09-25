import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { Card } from '../ui/Card';

type AuthVariant = 'applicant' | 'admin';

interface AuthPageLayoutProps {
  variant: AuthVariant;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

const headerClasses: Record<AuthVariant, string> = {
  applicant: 'bg-gov-blue-ultralight border-b border-blue-100',
  admin: 'bg-gov-blue-dark border-b border-blue-900',
};

const eyebrowClasses: Record<AuthVariant, string> = {
  applicant: 'text-gov-saffron-dark',
  admin: 'text-amber-300',
};

const titleClasses: Record<AuthVariant, string> = {
  applicant: 'text-gov-blue-dark',
  admin: 'text-white',
};

const descriptionClasses: Record<AuthVariant, string> = {
  applicant: 'text-slate-600',
  admin: 'text-slate-200',
};

function ApplicantIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.8-4 3.1-6 6.5-6s5.7 2 6.5 6" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.6 1.6 3.5-3.7" />
    </svg>
  );
}

export function AuthPageLayout({ variant, eyebrow, title, description, children }: AuthPageLayoutProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="bg-gov-slate-bg py-8 sm:py-10 md:py-12">
      <div className="mx-auto max-w-xl px-4">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
          to={ROUTES.home}
        >
          ← Back to Home
        </Link>

        <Card accentClass="overflow-hidden mt-4">
          <div className={`p-5 sm:p-6 ${headerClasses[variant]}`}>
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border ${
                  variant === 'applicant'
                    ? 'border-amber-300 bg-amber-100 text-gov-saffron-dark'
                    : 'border-blue-700 bg-blue-950/40 text-amber-300'
                }`}
              >
                {variant === 'applicant' ? <ApplicantIcon /> : <AdminIcon />}
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${eyebrowClasses[variant]}`}>
                  {eyebrow}
                </p>
                <h2 className={`mt-1 text-xl font-bold sm:text-2xl ${titleClasses[variant]}`}>{title}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${descriptionClasses[variant]}`}>{description}</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 rounded border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
              Prototype mode: this page does not accept authentication. Do not enter a real password.
            </div>
            {children}
          </div>
        </Card>
      </div>
    </section>
  );
}
