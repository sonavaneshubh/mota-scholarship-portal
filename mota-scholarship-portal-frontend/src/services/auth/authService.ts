import type { Session, User } from '@supabase/supabase-js';
import { ROUTES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import type { AuthProfile, UserRole } from '../../types';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  mobile?: string;
}

export interface AuthResult {
  success: boolean;
  error: string | null;
}

export interface SignInResult extends AuthResult {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  role: UserRole | null;
}

export interface SignUpResult extends SignInResult {
  requiresEmailConfirmation: boolean;
}

interface ProfileResult {
  profile: AuthProfile | null;
  error: string | null;
}

const notConfiguredMessage =
  'Supabase authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.';

function getBrowserUrl(path: string) {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return new URL(path, window.location.origin).toString();
}

function getErrorMessage(error: { message?: string } | null | undefined, fallback: string) {
  const message = error?.message?.toLowerCase() ?? '';

  if (message.includes('invalid login credentials')) {
    return 'The email or password is incorrect.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  if (message.includes('user already registered')) {
    return 'An account with this email already exists.';
  }

  if (message.includes('password should be at least')) {
    return 'Choose a stronger password with at least the required length.';
  }

  if (message.includes('unable to validate email') || message.includes('invalid email')) {
    return 'Enter a valid email address.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Unable to reach the authentication service. Check your connection and try again.';
  }

  return fallback;
}

function getExceptionMessage(error: unknown, fallback: string) {
  return getErrorMessage(error instanceof Error ? error : null, fallback);
}

function failedSignIn(error: string): SignInResult {
  return {
    success: false,
    error,
    user: null,
    session: null,
    profile: null,
    role: null,
  };
}

function failedSignUp(error: string): SignUpResult {
  return {
    ...failedSignIn(error),
    requiresEmailConfirmation: false,
  };
}

function normalizeProfile(value: unknown): AuthProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AuthProfile>;

  if (typeof candidate.id !== 'string' || (candidate.role !== 'applicant' && candidate.role !== 'admin')) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: candidate.id,
    full_name: typeof candidate.full_name === 'string' ? candidate.full_name : null,
    email: typeof candidate.email === 'string' ? candidate.email : null,
    role: candidate.role,
    created_at: typeof candidate.created_at === 'string' ? candidate.created_at : now,
    updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : now,
  };
}

export async function getSession(): Promise<{ session: Session | null; error: string | null }> {
  if (!supabase) {
    return { session: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    return {
      session: data.session,
      error: error ? getErrorMessage(error, 'Unable to restore the authentication session.') : null,
    };
  } catch (error) {
    return {
      session: null,
      error: getExceptionMessage(error, 'Unable to restore the authentication session.'),
    };
  }
}

export async function getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    return {
      user: data.user,
      error: error ? getErrorMessage(error, 'Unable to verify the current user.') : null,
    };
  } catch (error) {
    return {
      user: null,
      error: getExceptionMessage(error, 'Unable to verify the current user.'),
    };
  }
}

export async function getProfile(userId: string): Promise<ProfileResult> {
  if (!supabase) {
    return { profile: null, error: notConfiguredMessage };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return {
        profile: null,
        error: getErrorMessage(error, 'Your profile could not be loaded. Ask an administrator to verify your account.'),
      };
    }

    const profile = normalizeProfile(data);

    return profile
      ? { profile, error: null }
      : { profile: null, error: 'Your profile could not be loaded. Ask an administrator to verify your account.' };
  } catch (error) {
    return {
      profile: null,
      error: getExceptionMessage(error, 'Your profile could not be loaded. Ask an administrator to verify your account.'),
    };
  }
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  if (!supabase) {
    return failedSignUp(notConfiguredMessage);
  }

  try {
    const metadata: Record<string, string> = { full_name: input.fullName.trim() };

    if (input.username?.trim()) {
      metadata.username = input.username.trim();
    }

    if (input.mobile?.trim()) {
      metadata.mobile = input.mobile.trim();
    }

    const redirectTo = getBrowserUrl(ROUTES.applicant.login);
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: metadata,
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    });

    if (error) {
      return failedSignUp(getErrorMessage(error, 'Registration could not be completed. Please try again.'));
    }

    if (!data.user || !data.session) {
      return {
        success: true,
        error: null,
        user: data.user,
        session: null,
        profile: null,
        role: null,
        requiresEmailConfirmation: true,
      };
    }

    const profileResult = await getProfile(data.user.id);

    if (profileResult.error || !profileResult.profile) {
      return {
        ...failedSignUp(profileResult.error ?? 'Your profile could not be loaded. Ask an administrator to verify your account.'),
        user: data.user,
        session: data.session,
      };
    }

    return {
      success: true,
      error: null,
      user: data.user,
      session: data.session,
      profile: profileResult.profile,
      role: profileResult.profile.role,
      requiresEmailConfirmation: false,
    };
  } catch (error) {
    return failedSignUp(getExceptionMessage(error, 'Registration could not be completed. Please try again.'));
  }
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!supabase) {
    return failedSignIn(notConfiguredMessage);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      return failedSignIn(getErrorMessage(error, 'Sign in could not be completed. Please try again.'));
    }

    if (!data.user || !data.session) {
      return failedSignIn('Sign in did not return an authenticated session.');
    }

    const profileResult = await getProfile(data.user.id);

    if (profileResult.error || !profileResult.profile) {
      return {
        ...failedSignIn(profileResult.error ?? 'Your profile could not be loaded. Ask an administrator to verify your account.'),
        user: data.user,
        session: data.session,
      };
    }

    return {
      success: true,
      error: null,
      user: data.user,
      session: data.session,
      profile: profileResult.profile,
      role: profileResult.profile.role,
    };
  } catch (error) {
    return failedSignIn(getExceptionMessage(error, 'Sign in could not be completed. Please try again.'));
  }
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();

    return {
      success: !error,
      error: error ? getErrorMessage(error, 'Sign out could not be completed. Please try again.') : null,
    };
  } catch (error) {
    return {
      success: false,
      error: getExceptionMessage(error, 'Sign out could not be completed. Please try again.'),
    };
  }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: notConfiguredMessage };
  }

  try {
    const redirectTo = getBrowserUrl(ROUTES.resetPassword);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      redirectTo ? { redirectTo } : {},
    );

    return {
      success: !error,
      error: error ? getErrorMessage(error, 'Password reset could not be requested. Please try again.') : null,
    };
  } catch (error) {
    return {
      success: false,
      error: getExceptionMessage(error, 'Password reset could not be requested. Please try again.'),
    };
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (!supabase) {
    return { success: false, error: notConfiguredMessage };
  }

  try {
    const { error } = await supabase.auth.updateUser({ password });

    return {
      success: !error,
      error: error ? getErrorMessage(error, 'Password could not be updated. Please try again.') : null,
    };
  } catch (error) {
    return {
      success: false,
      error: getExceptionMessage(error, 'Password could not be updated. Please try again.'),
    };
  }
}
