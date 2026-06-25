'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from './api';

interface AuthUser {
  id: string;
  email: string;
  credits: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
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
      .then((res) => setUser({ id: res.data.id, email: res.data.email, credits: res.data.credits }))
      .catch(() => localStorage.removeItem('fc_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('fc_token', token);
    setAuthToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('fc_token');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
