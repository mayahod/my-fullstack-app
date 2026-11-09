import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../services/config';

const AuthContext = createContext(null);
const SESSION_HINT = 'recipe-session';
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(SESSION_HINT)));
  const [authError, setAuthError] = useState(null);
  const pending = useRef(null);
  const user = session?.user ?? null;
  const expiresAt = session?.expiresAt;

  const clearSession = useCallback(() => {
    pending.current?.abort();
    localStorage.removeItem(SESSION_HINT);
    setSession(null);
    setChecking(false);
    setAuthError(null);
  }, []);

  const login = ({ user, expiresAt }) => {
    if (!user?.id || !Number.isFinite(Date.parse(expiresAt))) {
      throw new Error('לא ניתן להשלים את ההתחברות כרגע');
    }
    pending.current?.abort();
    localStorage.setItem(SESSION_HINT, expiresAt);
    setSession({ user, expiresAt });
    setChecking(false);
    setAuthError(null);
  };

  const updateUser = (user) => setSession((current) => current && { ...current, user });

  const retryAuth = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { signal } = controller;
    setChecking(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE}/api/users/me`, { signal });
      if (signal.aborted) return;
      if (response.status === 401) return clearSession();
      if (!response.ok) throw new Error('Authentication check failed');
      const data = await response.json();
      if (!signal.aborted) setSession(data);
    } catch {
      if (!signal.aborted) setAuthError('לא ניתן לבדוק את ההתחברות כרגע. נסו שוב.');
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }, [clearSession]);

  useEffect(() => {
    // Remove credentials stored by earlier versions. The new key is only a non-secret UI hint.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (localStorage.getItem(SESSION_HINT)) retryAuth();
    const sync = (event) => {
      if (event.key !== SESSION_HINT && event.key !== null) return;
      if (event.newValue) retryAuth();
      else clearSession();
    };
    window.addEventListener('storage', sync);
    return () => {
      pending.current?.abort();
      window.removeEventListener('storage', sync);
    };
  }, [clearSession, retryAuth]);

  useEffect(() => {
    if (!expiresAt) return;
    const expiry = new Date(expiresAt).getTime();
    const timer = setTimeout(clearSession, Math.max(0, expiry - Date.now()));
    const checkExpiry = () => {
      if (expiry <= Date.now()) clearSession();
    };
    window.addEventListener('focus', checkExpiry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
    };
  }, [clearSession, expiresAt]);

  const logout = async () => {
    const response = await fetch(`${API_BASE}/api/users/logout`, { method: 'POST' });
    if (!response.ok) throw new Error('לא ניתן להתנתק כרגע. נסו שוב.');
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuth: Boolean(user),
        checking,
        authError,
        retryAuth,
        login,
        logout,
        clearSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
