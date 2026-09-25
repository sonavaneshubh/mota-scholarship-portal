import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthProfile, ApplicantProfile, UserRole } from '../types';
import type { AuthResult, SignInResult, SignUpInput, SignUpResult } from '../services/auth/authService';

export interface ApplicantAuthContextValue {
  session: Session | null;
  authUser: User | null;
  user: ApplicantProfile | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  profileError: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (identifier: string) => boolean;
  signOut: () => void;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

export const ApplicantAuthContext = createContext<ApplicantAuthContextValue | undefined>(undefined);
