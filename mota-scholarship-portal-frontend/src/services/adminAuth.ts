import type { AdminAuthResult, AdminSession, AdminUser } from '../types/admin';

export const ADMIN_SESSION_KEY = 'mota-admin-session';
export const ADMIN_DEMO_IDENTIFIER = 'admin@motademo.in';
export const ADMIN_DEMO_PASSWORD = 'MotaDemo#2026';

const DEMO_ADMIN: AdminUser = {
  id: 'admin-001',
  adminId: 'MOTA-ADM-001',
  name: 'Ravi Shankar',
  email: 'admin@motademo.in',
  role: 'Super Admin',
  status: 'Active',
  lastLogin: '24 September 2026, 09:42',
  initials: 'RS',
};

function isAdminSession(value: unknown): value is AdminSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AdminSession>;
  const user = candidate.user as Partial<AdminUser> | undefined;

  return (
    typeof candidate.signedInAt === 'string' &&
    typeof candidate.remember === 'boolean' &&
    Boolean(user) &&
    typeof user?.id === 'string' &&
    typeof user.adminId === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    typeof user.status === 'string' &&
    typeof user.initials === 'string'
  );
}

function removeStoredSession(storage: Storage) {
  try {
    storage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    return;
  }
}

export function readAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storages = [window.localStorage, window.sessionStorage];

  for (const storage of storages) {
    try {
      const stored = storage.getItem(ADMIN_SESSION_KEY);

      if (!stored) {
        continue;
      }

      const parsed: unknown = JSON.parse(stored);

      if (isAdminSession(parsed)) {
        return parsed;
      }

      removeStoredSession(storage);
    } catch {
      removeStoredSession(storage);
    }
  }

  return null;
}

export function storeAdminSession(session: AdminSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storage = session.remember ? window.localStorage : window.sessionStorage;
  const otherStorage = session.remember ? window.sessionStorage : window.localStorage;

  try {
    otherStorage.removeItem(ADMIN_SESSION_KEY);
    storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch {
    return;
  }
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    return;
  }
}

export async function authenticateAdmin(identifier: string, password: string): Promise<AdminAuthResult> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 550);
  });

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const acceptedIdentifiers = new Set([
    ADMIN_DEMO_IDENTIFIER,
    DEMO_ADMIN.adminId.toLowerCase(),
    'admin',
  ]);

  if (!acceptedIdentifiers.has(normalizedIdentifier)) {
    return {
      ok: false,
      message: 'The admin ID or password is incorrect. Use the development demo account to continue.',
    };
  }

  if (password !== ADMIN_DEMO_PASSWORD) {
    return {
      ok: false,
      message: 'The admin ID or password is incorrect. Use the development demo account to continue.',
    };
  }

  return {
    ok: true,
    user: { ...DEMO_ADMIN },
  };
}
