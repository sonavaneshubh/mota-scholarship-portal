import { createContext } from 'react';
import type { AdminAuthResult, AdminSession, AdminUser } from '../types/admin';

export interface AdminAuthContextValue {
  session: AdminSession | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  /**
   * `mode` defaults to 'prototype' (the offline admin shell). 'demo' signs in
   * against Supabase Auth and requires the read-only `demo_admin` role, so the
   * two can never be confused at a call site.
   */
  signIn: (
    identifier: string,
    password: string,
    remember: boolean,
    mode?: 'prototype' | 'demo',
  ) => Promise<AdminAuthResult>;
  /**
   * One-click Demo Admin sign-in: no credential is collected, because the
   * server-side broker holds the read-only account's password and returns only a
   * session. `canRetryWithCredentials` in the failure case reports whether the
   * manual form is worth offering.
   */
  signInDemo: (remember: boolean) => Promise<AdminAuthResult>;
  signOut: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);
