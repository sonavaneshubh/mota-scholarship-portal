import { createContext } from 'react';
import type { ApplicantProfile, ApplicantSession } from '../types';

export interface ApplicantAuthContextValue {
  session: ApplicantSession | null;
  user: ApplicantProfile | null;
  isAuthenticated: boolean;
  signIn: (identifier: string) => void;
  signOut: () => void;
}

export const ApplicantAuthContext = createContext<ApplicantAuthContextValue | undefined>(undefined);
