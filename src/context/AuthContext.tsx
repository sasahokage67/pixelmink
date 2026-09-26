'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  languages: string;
  teachingHours: number;
  learningHours: number;
  rating: number;
  reviewsCount: number;
  verified: boolean;
  timezone: string;
  xCredits: number;
  availability: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  profile: UserProfile | null;
  userSkills?: any[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchDemoUser: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Intercept browser fetch to attach Authorization header if token exists in localStorage
if (typeof window !== 'undefined' && !(window as any).__pixelmink_fetch_intercepted) {
  (window as any).__pixelmink_fetch_intercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    try {
      const token = localStorage.getItem('pixelmink_token');
      if (token) {
        config = config || {};
        const headers = new Headers(config.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        config.headers = headers;
      }
    } catch {}
    return originalFetch(resource, config);
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('pixelmink_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password = 'password123') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (data.token && typeof window !== 'undefined') {
          localStorage.setItem('pixelmink_token', data.token);
        }
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (formData: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (data.token && typeof window !== 'undefined') {
          localStorage.setItem('pixelmink_token', data.token);
        }
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Ошибка регистрации' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка сети при регистрации' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pixelmink_token');
      localStorage.removeItem('pixelmink_guest_name');
    }
    setUser(null);
  };

  const switchDemoUser = async (email: string) => {
    setLoading(true);
    await login(email, 'password123');
    setLoading(false);
    window.location.reload();
  };

  const refreshUser = async () => {
    try {
      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('pixelmink_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) setUser(data.user);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        switchDemoUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
