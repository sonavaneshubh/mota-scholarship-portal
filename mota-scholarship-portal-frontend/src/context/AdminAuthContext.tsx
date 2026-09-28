import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  authenticateAdmin,
  clearAdminSession,
  readAdminSession,
  storeAdminSession,
} from '../services/adminAuth';
import {
  restoreDemoAdminSession,
  signInDemoAdmin,
  signInDemoAdminWithSessionBroker,
  signOutDemoAdmin,
} from '../services/demoAdminAuth';
import type { AdminAuthResult, AdminSession, AdminUser } from '../types/admin';
import { AdminAuthContext } from './AdminAuthContextValue';

const DEMO_ADMIN_USER_NAME = 'Demo Admin (read-only)';

function toDemoAdminSession(identity: { userId: string; email: string; signedInAt: string }, remember: boolean): AdminSession {
  const user: AdminUser = {
    id: identity.userId,
    adminId: identity.email,
    name: DEMO_ADMIN_USER_NAME,
    email: identity.email,
    role: 'Demo Admin',
    status: 'Active',
    lastLogin: new Date(identity.signedInAt).toLocaleString('en-IN'),
    initials: 'DA',
  };

  return { user, signedInAt: identity.signedInAt, remember, mode: 'demo' };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(readAdminSession);

  // A refresh keeps the Supabase session but reloads the page, so the admin
  // shell's own record is the thing that decides whether the user is still
  // inside. Re-check it once on mount: a demo session whose Supabase session
  // expired (or whose role was revoked) must not linger as a usable shell.
  useEffect(() => {
    const stored = readAdminSession();

    if (stored?.mode !== 'demo') {
      return;
    }

    let active = true;

    void restoreDemoAdminSession().then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        clearAdminSession();
        setSession(null);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (
    identifier: string,
    password: string,
    remember: boolean,
    mode: 'prototype' | 'demo' = 'prototype',
  ): Promise<AdminAuthResult> => {
    if (mode === 'demo') {
      const demoResult = await signInDemoAdmin(identifier, password);

      if (!demoResult.ok) {
        return { ok: false, message: demoResult.error };
      }

      const nextSession = toDemoAdminSession(demoResult.identity, remember);

      storeAdminSession(nextSession);
      setSession(nextSession);
      return { ok: true, user: nextSession.user };
    }

    const result = await authenticateAdmin(identifier, password);

    if (!result.ok || !result.user) {
      return result;
    }

    const nextSession: AdminSession = {
      user: result.user,
      signedInAt: new Date().toISOString(),
      remember,
      mode: 'prototype',
    };

    storeAdminSession(nextSession);
    setSession(nextSession);
    return result;
  }, []);

  /**
   * The one-click path. Takes no credential from the caller at all: the browser
   * asks the server-side broker for a session on the read-only demo account.
   */
  const signInDemo = useCallback(async (remember: boolean): Promise<AdminAuthResult> => {
    const result = await signInDemoAdminWithSessionBroker();

    if (!result.ok) {
      return { ok: false, message: result.error, canRetryWithCredentials: result.fallbackAvailable !== false };
    }

    const nextSession = toDemoAdminSession(result.identity, remember);

    storeAdminSession(nextSession);
    setSession(nextSession);
    return { ok: true, user: nextSession.user };
  }, []);

  const signOut = useCallback(() => {
    // Signing out of a demo session has to end the Supabase session too, or the
    // auth token is still usable from storage after the user left the panel.
    if (session?.mode === 'demo') {
      void signOutDemoAdmin();
    }
    clearAdminSession();
    setSession(null);
  }, [session?.mode]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      signIn,
      signInDemo,
      signOut,
    }),
    [session, signIn, signInDemo, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
