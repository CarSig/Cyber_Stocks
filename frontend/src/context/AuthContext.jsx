import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';
import { clerkAuth } from '@/api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { getToken, signOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user'));
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  const persist = (token, userData) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!clerkUser) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      queueMicrotask(() => {
        setUser(null);
        setReady(true);
      });
      return;
    }
    getToken().then(async (clerkToken) => {
      if (!clerkToken) {
        setReady(true);
        return;
      }
      try {
        const data = await clerkAuth(clerkToken);
        persist(data.token, data.user);
      } catch (e) {
        console.error('[clerk exchange failed]', e.message);
      }
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.id, clerkLoaded]);

  const logout = useCallback(async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    await signOut();
  }, [signOut]);

  return <AuthContext.Provider value={{ user, logout, ready }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
