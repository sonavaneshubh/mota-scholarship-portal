import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  authenticateAdmin,
  clearAdminSession,
  readAdminSession,
  storeAdminSession,
} from '../services/adminAuth';
import type { AdminAuthResult, AdminSession } from '../types/admin';
import { AdminAuthContext } from './AdminAuthContextValue';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(readAdminSession);

  const signIn = useCallback(async (
    identifier: string,
    password: string,
    remember: boolean,
  ): Promise<AdminAuthResult> => {
    const result = await authenticateAdmin(identifier, password);

    if (!result.ok || !result.user) {
      return result;
    }

    const nextSession: AdminSession = {
      user: result.user,
      signedInAt: new Date().toISOString(),
      remember,
    };

    storeAdminSession(nextSession);
    setSession(nextSession);
    return result;
  }, []);

  const signOut = useCallback(() => {
    clearAdminSession();
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

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
