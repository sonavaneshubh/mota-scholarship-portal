import { useContext } from 'react';
import { AdminAuthContext } from './AdminAuthContextValue';

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}
