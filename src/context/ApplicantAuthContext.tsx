import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ApplicantProfile, ApplicantSession } from '../types';
import { ApplicantAuthContext } from './ApplicantAuthContextValue';

export const APPLICANT_SESSION_KEY = 'mota-applicant-session';

const DEMO_PROFILE: ApplicantProfile = {
  id: 'applicant-demo-001',
  name: 'Aarav Kumar',
  email: 'aarav.kumar@example.in',
  mobile: '+91 98765 43210',
  state: 'Odisha',
  district: 'Khordha',
  category: 'Scheduled Tribe',
  course: 'B.Tech, Computer Science',
  institution: 'Kalinga Institute of Technology',
  avatarInitials: 'AK',
  profileCompletion: 82,
};

function isApplicantSession(value: unknown): value is ApplicantSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ApplicantSession>;
  const user = candidate.user as Partial<ApplicantProfile> | undefined;

  return (
    typeof candidate.signedInAt === 'string' &&
    Boolean(user) &&
    typeof user?.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.mobile === 'string' &&
    typeof user.avatarInitials === 'string'
  );
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(APPLICANT_SESSION_KEY);

    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);

    if (!isApplicantSession(parsed)) {
      window.localStorage.removeItem(APPLICANT_SESSION_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function ApplicantAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApplicantSession | null>(readStoredSession);

  const signIn = useCallback((identifier: string) => {
    const value = identifier.trim();
    const nextSession: ApplicantSession = {
      user: {
        ...DEMO_PROFILE,
        email: value.includes('@') ? value : DEMO_PROFILE.email,
        mobile: value.includes('@') ? DEMO_PROFILE.mobile : value,
      },
      signedInAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(APPLICANT_SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      return;
    }

    setSession(nextSession);
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(APPLICANT_SESSION_KEY);
    } catch {
      return;
    }

    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return <ApplicantAuthContext.Provider value={value}>{children}</ApplicantAuthContext.Provider>;
}
