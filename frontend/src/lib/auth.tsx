'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, setAuthToken } from './api';

interface AuthUser {
  id: string;
  email: string;
  credits: number;
  /** Null until the player picks one. UsernameGate forces that to happen. */
  username: string | null;
  usernameChangedAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  /** Patch the cached user after a successful write, instead of refetching. */
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fc_token');
    if (!token) { setLoading(false); return; }

    setAuthToken(token);
    api.get('/api/users/me')
      .then((res) => setUser({
        id: res.data.id,
        email: res.data.email,
        credits: res.data.credits,
        // `?? null` on purpose: during a deploy the old backend can still be
        // answering and has no username field at all. Undefined would read as
        // "not set" and bounce the player into the gate on every page.
        username: res.data.username ?? null,
        usernameChangedAt: res.data.usernameChangedAt ?? null,
      }))
      .catch(() => localStorage.removeItem('fc_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('fc_token', token);
    setAuthToken(token);
    // Normalised here rather than at the call site: the login response is
    // untyped axios data, and an old backend answering mid-deploy omits these
    // two fields entirely.
    setUser({
      ...user,
      username: user.username ?? null,
      usernameChangedAt: user.usernameChangedAt ?? null,
    });
  };

  const logout = () => {
    localStorage.removeItem('fc_token');
    setAuthToken(null);
    setUser(null);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  return { user, loading };
}

/** Where a player without a username is sent, and the one route exempt from it. */
export const USERNAME_SETUP_PATH = '/settings/username';

/**
 * Sends a logged-in player without a username to pick one.
 *
 * Every account predates the username column, so this fires for existing
 * players on their next visit as well as for new registrations. Exempts the
 * setup page itself and the auth pages, which would otherwise loop.
 */
export function useRequireUsername() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const exempt = pathname === USERNAME_SETUP_PATH || pathname.startsWith('/auth/');

  useEffect(() => {
    if (loading || !user || exempt) return;
    if (user.username == null) router.push(USERNAME_SETUP_PATH);
  }, [user, loading, exempt, router]);
}
