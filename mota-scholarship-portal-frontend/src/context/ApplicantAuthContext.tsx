import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { diagnostic, diagnosticError } from '../lib/diagnostics';
import type { ApplicantProfile, AuthProfile } from '../types';
import {
  getProfile,
  getSession,
  resetPassword as requestPasswordReset,
  signIn as signInWithSupabase,
  signOut as signOutFromSupabase,
  updatePassword as updateSupabasePassword,
} from '../services/auth/authService';
import { ApplicantAuthContext } from './ApplicantAuthContextValue';

export const APPLICANT_SESSION_KEY = 'mota-applicant-session';

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

  // No completion percentage is derived here on purpose. Counting the handful of
  // registration-metadata fields would report 100% for an applicant whose profile
  // is empty, which is exactly the number the portal must never show. The real
  // figure comes from public.applicant_profile_completeness() via
  // services/profileService.fetchCompleteness().
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
      diagnosticError(
        'applicant-auth',
        'no Supabase client, so no session can be restored and every protected route stays signed out',
      );
      clearAuthState();
      return () => {
        active = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      // Event name and presence only. Never the session itself: it carries the
      // access and refresh tokens.
      diagnostic('applicant-auth', 'auth state changed', {
        event,
        authenticated: Boolean(nextSession),
        userId: nextSession?.user?.id ?? null,
      });

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

      // A profile that cannot be read is the difference between "this account has
      // no profile yet" and "RLS is hiding it", and the two need different fixes.
      if (result.error) {
        diagnosticError('applicant-auth', 'profile could not be loaded', {
          userId: authUser.id,
          error: result.error,
        });
      } else {
        diagnostic('applicant-auth', 'profile loaded', {
          userId: authUser.id,
          role: result.profile?.role ?? null,
        });
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
      updatePassword,
      user,
    ],
  );

  return <ApplicantAuthContext.Provider value={value}>{children}</ApplicantAuthContext.Provider>;
}
