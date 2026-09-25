import { useContext } from 'react';
import { ApplicantAuthContext } from './ApplicantAuthContextValue';

export function useApplicantAuth() {
  const context = useContext(ApplicantAuthContext);

  if (!context) {
    throw new Error('useApplicantAuth must be used within ApplicantAuthProvider');
  }

  return context;
}
