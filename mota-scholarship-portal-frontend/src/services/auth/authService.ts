import type { Session, User } from '@supabase/supabase-js';
import { ROUTES } from '../../lib/constants';
import { missingSupabaseEnvVars, supabase, DEMO_MODE, supabaseConfigNotice } from '../../lib/supabase';
import { diagnostic, diagnosticError } from '../../lib/diagnostics';
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

const notConfiguredMessage = supabaseConfigNotice;

/**
 * Developer-facing detail about a misconfigured build.
 *
 * The variable names are safe to log and are the difference between "the
 * deployment forgot an environment variable" and "the deployment is pointing at
 * a Supabase project whose auth settings reject this request". Never shown to an
 * applicant.
 */
function describeMissingConfiguration(): Record<string, unknown> {
  return { missingEnvVars: missingSupabaseEnvVars, demoMode: DEMO_MODE };
}

const DEMO_USERS = [
  {
    email: 'demo@applicant.test',
    password: 'demo123',
    fullName: 'Demo Applicant',
    mobile: '9876543210',
    state: 'Maharashtra',
    district: 'Mumbai',
    category: 'ST',
    course: 'B.Tech Computer Science',
    institution: 'IIT Mumbai',
  },
  {
    email: 'student@test.com',
    password: 'student123',
    fullName: 'Test Student',
    mobile: '9123456789',
    state: 'Delhi',
    district: 'New Delhi',
    category: 'SC',
    course: 'MBBS',
    institution: 'AIIMS Delhi',
  },
];

function createMockUser(demoUser: typeof DEMO_USERS[0]) {
  const mockUser: User = {
    id: `demo-${demoUser.email}`,
    email: demoUser.email,
    user_metadata: {
      full_name: demoUser.fullName,
      mobile: demoUser.mobile,
      state: demoUser.state,
      district: demoUser.district,
      category: demoUser.category,
      course: demoUser.course,
      institution: demoUser.institution,
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    role: 'authenticated',
  } as User;

  const mockSession: Session = {
    access_token: 'demo-token',
    refresh_token: 'demo-refresh',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockProfile: AuthProfile = {
    id: mockUser.id,
    full_name: demoUser.fullName,
    email: demoUser.email,
    role: 'applicant',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { mockUser, mockSession, mockProfile };
}

function getBrowserUrl(path: string) {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return new URL(path, window.location.origin).toString();
}

function getErrorMessage(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const message = error?.message?.toLowerCase() ?? '';
  const code = (error as { code?: string } | null | undefined)?.code ?? '';

  if (message.includes('permission denied') || message.includes('row-level security') || code === '42501') {
    return 'Your profile could not be accessed. Please contact the administrator.';
  }

  if (message.includes('failed to fetch') || message.includes('network') || message.includes('fetch failed')) {
    return "We couldn't connect to the authentication service. Please try again.";
  }

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  if (message.includes('email address') && message.includes('invalid')) {
    return 'Enter a valid email address.';
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
  if (DEMO_MODE) {
    return { session: null, error: null };
  }

  if (!supabase) {
    return { session: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    // Presence only. The access and refresh tokens in `data.session` are never
    // passed to the logger, in any environment.
    diagnostic('auth', 'session restore', {
      restored: Boolean(data.session),
      userId: data.session?.user?.id ?? null,
      error: error?.message ?? null,
    });

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
  if (DEMO_MODE) {
    const demoUser = DEMO_USERS.find((u: typeof DEMO_USERS[0]) => `demo-${u.email}` === userId);
    if (demoUser) {
      const { mockProfile } = createMockUser(demoUser);
      return { profile: mockProfile, error: null };
    }
    return { profile: null, error: 'Demo user not found' };
  }

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
      diagnosticError('auth', 'profiles read failed', {
        userId,
        code: error.code ?? null,
        message: error.message,
      });
    }

    if (!error && data) {
      const profile = normalizeProfile(data);

      if (profile) {
        return { profile, error: null };
      }
    }

    const { data: userRes } = await supabase.auth.getUser();
    const currentUser = userRes?.user;

    if (currentUser && currentUser.id === userId) {
      if (!error) {
        const { data: newProfileData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: currentUser.user_metadata?.full_name?.trim() || null,
            email: currentUser.email || null,
            role: 'applicant',
          })
          .select('id, full_name, email, role, created_at, updated_at')
          .maybeSingle();

        if (!insertError && newProfileData) {
          const profile = normalizeProfile(newProfileData);

          if (profile) {
            diagnostic('auth', 'profiles row was missing and has been created for the signed-in user', {
              userId,
            });
            return { profile, error: null };
          }
        }

        if (insertError) {
          diagnosticError('auth', 'could not create the missing profiles row', {
            userId,
            code: insertError.code ?? null,
            message: insertError.message,
          });
        }
      }

      const fallbackProfile: AuthProfile = {
        id: currentUser.id,
        full_name: typeof currentUser.user_metadata?.full_name === 'string' ? currentUser.user_metadata.full_name : null,
        email: currentUser.email ?? null,
        role: 'applicant',
        created_at: currentUser.created_at ?? new Date().toISOString(),
        updated_at: currentUser.created_at ?? new Date().toISOString(),
      };

      return { profile: fallbackProfile, error: null };
    }

    return {
      profile: null,
      error: error
        ? getErrorMessage(error, 'Your profile could not be accessed. Please contact the administrator.')
        : 'Your account was created, but your applicant profile has not been created yet.',
    };
  } catch (error) {
    return {
      profile: null,
      error: getExceptionMessage(error, "We couldn't connect to the authentication service. Please try again."),
    };
  }
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  if (DEMO_MODE) {
    const existing = DEMO_USERS.find((u) => u.email === input.email.trim());
    if (existing) {
      return failedSignUp('An account with this email already exists.');
    }
    const newDemoUser = {
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
      mobile: input.mobile?.trim() || '',
      state: '',
      district: '',
      category: '',
      course: '',
      institution: '',
    };
    const { mockUser, mockSession, mockProfile } = createMockUser(newDemoUser);
    return {
      success: true,
      error: null,
      user: mockUser,
      session: mockSession,
      profile: mockProfile,
      role: 'applicant',
      requiresEmailConfirmation: false,
    };
  }

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
  // The email is logged because it is the input the applicant typed, and it is
  // the field that distinguishes "wrong password" from "this account does not
  // exist". The password is never passed to the logger and never logged.
  diagnostic('auth', 'sign-in requested', { email: email.trim(), demoMode: DEMO_MODE });

  if (DEMO_MODE) {
    const demoUser = DEMO_USERS.find((u: typeof DEMO_USERS[0]) => u.email === email.trim() && u.password === password);
    if (demoUser) {
      diagnostic('auth', 'sign-in resolved against a demo account', { email: email.trim() });
      const { mockUser, mockSession, mockProfile } = createMockUser(demoUser);
      return {
        success: true,
        error: null,
        user: mockUser,
        session: mockSession,
        profile: mockProfile,
        role: 'applicant',
      };
    }

    // No Supabase client exists, so this credential can never be checked against
    // a real account. Reporting it as a wrong password is what made the deployed
    // login look inert: the message named the demo accounts instead of the
    // missing environment variable, and nothing on screen explained why a correct
    // password was rejected. The reason is stated instead.
    diagnosticError('auth', 'sign-in rejected: no Supabase client is configured', {
      email: email.trim(),
      ...describeMissingConfiguration(),
    });

    return failedSignIn(notConfiguredMessage);
  }

  if (!supabase) {
    diagnosticError('auth', 'sign-in rejected: Supabase client missing', {
      email: email.trim(),
      ...describeMissingConfiguration(),
    });
    return failedSignIn(notConfiguredMessage);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      diagnosticError('auth', 'sign-in rejected by Supabase', {
        email: email.trim(),
        code: error.code ?? null,
        // The Supabase message is the diagnosis (invalid credentials, unconfirmed
        // email, rate limit, disabled sign-ups). It contains no secrets and no
        // token, and it is development-only, so it is logged verbatim.
        message: error.message,
      });
      return failedSignIn(getErrorMessage(error, 'Sign in could not be completed. Please try again.'));
    }

    if (!data.user || !data.session) {
      diagnosticError('auth', 'sign-in returned no session', { email: email.trim() });
      return failedSignIn('Sign in did not return an authenticated session.');
    }

    const profileResult = await getProfile(data.user.id);

    if (profileResult.error || !profileResult.profile) {
      diagnosticError('auth', 'sign-in succeeded but the profile could not be loaded', {
        userId: data.user.id,
        error: profileResult.error,
      });
      return {
        ...failedSignIn(profileResult.error ?? 'Your profile could not be loaded. Ask an administrator to verify your account.'),
        user: data.user,
        session: data.session,
      };
    }

    diagnostic('auth', 'sign-in succeeded', { userId: data.user.id, role: profileResult.profile.role });

    return {
      success: true,
      error: null,
      user: data.user,
      session: data.session,
      profile: profileResult.profile,
      role: profileResult.profile.role,
    };
  } catch (error) {
    diagnosticError('auth', 'sign-in threw', {
      email: email.trim(),
      message: error instanceof Error ? error.message : String(error),
    });
    return failedSignIn(getExceptionMessage(error, 'Sign in could not be completed. Please try again.'));
  }
}

export async function signOut(): Promise<AuthResult> {
  if (DEMO_MODE) {
    return { success: true, error: null };
  }

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
  if (DEMO_MODE) {
    const demoUser = DEMO_USERS.find((u: typeof DEMO_USERS[0]) => u.email === email.trim());
    if (demoUser) {
      return { success: true, error: null };
    }
    return { success: false, error: 'Demo account not found' };
  }

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
  if (DEMO_MODE) {
    return { success: true, error: null };
  }

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
