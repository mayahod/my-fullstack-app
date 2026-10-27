// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { tokenExpiry, validToken } from './session';
import { API_BASE } from '../services/config';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('token');
    if (validToken(saved)) return saved;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  });
  const [checking, setChecking] = useState(() => validToken(localStorage.getItem('token')));
  const [authError, setAuthError] = useState(null);
  const [retry, setRetry] = useState(0);
  const isAuth = !!user && validToken(token);

  const login = (userObj, jwt) => {
    setAuthError(null);
    setChecking(true);
    setUser(userObj);
    setToken(jwt);
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('token', jwt);
  };

  const logout = () => {
    setChecking(false);
    setAuthError(null);
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  useEffect(() => {
    if (!token) return;
    if (!validToken(token)) { logout(); return; }
    const controller = new AbortController();
    setChecking(true);
    setAuthError(null);
    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        if (res.status === 401) { logout(); return; }
        if (!res.ok) throw new Error('Authentication check failed');
        const data = await res.json();
        if (!controller.signal.aborted) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch (error) {
        if (error.name !== 'AbortError') setAuthError('לא ניתן לבדוק את ההתחברות כרגע. נסו שוב.');
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    };
    verify();
    const timeout = setTimeout(logout, Math.max(0, tokenExpiry(token) - Date.now()));
    const onFocus = () => { if (!validToken(token)) logout(); };
    window.addEventListener('focus', onFocus);
    const onStorage = (event) => {
      if (event.key === 'token' || event.key === null) {
        const saved = localStorage.getItem('token');
        if (!validToken(saved)) logout();
        else setToken(saved);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      controller.abort(); clearTimeout(timeout);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [token, retry]);

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  return (
    <AuthContext.Provider value={{ user, token, isAuth, checking, authError, retryAuth: () => setRetry((value) => value + 1), login, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}
