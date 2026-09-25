import { createContext } from 'react';
import type { AdminAuthResult, AdminSession, AdminUser } from '../types/admin';

export interface AdminAuthContextValue {
  session: AdminSession | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  signIn: (identifier: string, password: string, remember: boolean) => Promise<AdminAuthResult>;
  signOut: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);
