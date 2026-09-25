import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ApplicantProfile, AuthProfile } from '../types';
import {
  getProfile,
  getSession,
  resetPassword as requestPasswordReset,
  signIn as signInWithSupabase,
  signOut as signOutFromSupabase,
  signUp as signUpWithSupabase,
  updatePassword as updateSupabasePassword,
} from '../services/auth/authService';
import type { SignUpInput } from '../services/auth/authService';
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
    typeof user.state === 'string' &&
    typeof user.district === 'string' &&
    typeof user.category === 'string' &&
    typeof user.course === 'string' &&
    typeof user.institution === 'string' &&
    typeof user.avatarInitials === 'string'
  );
function getMetadataString(user: User, key: string) {
  const value = user.user_metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'A';
}

function toApplicantProfile(authUser: User, profile: AuthProfile | null): ApplicantProfile {
  const name =
    profile?.full_name?.trim() ||
    getMetadataString(authUser, 'full_name') ||
    authUser.email?.split('@')[0] ||
    'Applicant';
  const email = profile?.email || authUser.email || '';
  const mobile = getMetadataString(authUser, 'mobile');
  const state = getMetadataString(authUser, 'state');
  const district = getMetadataString(authUser, 'district');
  const category = getMetadataString(authUser, 'category');
  const course = getMetadataString(authUser, 'course');
  const institution = getMetadataString(authUser, 'institution');
  const completedFields = [name, email, mobile, state, district, category, course, institution].filter(Boolean).length;

  return {
    id: authUser.id,
    name,
    email,
    mobile,
    state,
    district,
    category,
    course,
    institution,
    avatarInitials: getInitials(name),
    profileCompletion: Math.round((completedFields / 8) * 100),
  };
}

export function ApplicantAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setAuthUser(null);
    setProfile(null);
    setProfileError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      clearAuthState();
      return () => {
        active = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);

      if (!nextSession) {
        setProfile(null);
        setProfileError(null);
      }
    });

    void getSession().then((result) => {
      if (!active) {
        return;
      }

      if (result.error) {
        setProfileError(result.error);
        setLoading(false);
        return;
      }

      setSession(result.session);
      setAuthUser(result.session?.user ?? null);

      if (!result.session) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [clearAuthState]);

  useEffect(() => {
    let active = true;

    if (!authUser) {
      setProfile(null);
      setProfileError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    void getProfile(authUser.id).then((result) => {
      if (!active) {
        return;
      }

      setProfile(result.profile);
      setProfileError(result.error);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await signInWithSupabase(email, password);

      if (!result.success) {
        if (result.session) {
          await signOutFromSupabase();
          clearAuthState();
        }
        return result;
      }

      setSession(result.session);
      setAuthUser(result.user);
      setProfile(result.profile);
      setProfileError(null);
      setLoading(false);
      return result;
    },
    [clearAuthState],
  );

    try {
      window.localStorage.setItem(APPLICANT_SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      return false;
    }

    setSession(nextSession);
    return true;
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(APPLICANT_SESSION_KEY);
    } finally {
      setSession(null);
    }
  }, []);
  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await signUpWithSupabase(input);

      if (!result.success) {
        if (result.session) {
          await signOutFromSupabase();
          clearAuthState();
        }
        return result;
      }

      if (result.session && result.user) {
        setSession(result.session);
        setAuthUser(result.user);
        setProfile(result.profile);
        setProfileError(null);
        setLoading(false);
      }

      return result;
    },
    [clearAuthState],
  );

  const signOut = useCallback(async () => {
    const result = await signOutFromSupabase();

    if (result.success) {
      clearAuthState();
    }

    return result;
  }, [clearAuthState]);

  const resetPassword = useCallback((email: string) => requestPasswordReset(email), []);
  const updatePassword = useCallback((password: string) => updateSupabasePassword(password), []);

  const user = useMemo(() => (authUser ? toApplicantProfile(authUser, profile) : null), [authUser, profile]);
  const value = useMemo(
    () => ({
      session,
      authUser,
      user,
      profile,
      role: profile?.role ?? null,
      profileError,
      loading,
      isAuthenticated: Boolean(session && authUser),
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      authUser,
      loading,
      profile,
      profileError,
      resetPassword,
      session,
      signIn,
      signOut,
      signUp,
      updatePassword,
      user,
    ],
  );

  return <ApplicantAuthContext.Provider value={value}>{children}</ApplicantAuthContext.Provider>;
}
