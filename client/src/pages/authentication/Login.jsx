import { useState } from 'react';
import styles from './Auth.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../services/config';
import GoogleSignIn from '../../components/GoogleSignIn';
import useGoogleClientId from '../../context/useGoogleClientId';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleClientId = useGoogleClientId();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(null);

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState(null);
  const [resetType, setResetType] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const completeLogin = (session) => {
    login(session);
    const from = location.state?.from;
    const destination =
      from?.pathname?.startsWith('/') && !from.pathname.startsWith('//')
        ? `${from.pathname}${from.search || ''}${from.hash || ''}`
        : '/community';
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        completeLogin(data);
        return;
      }
      setMessage(data.message || 'שגיאה בהתחברות');
    } catch {
      setMessage('שגיאה בשרת');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (e) => {
    e.preventDefault();
    setResetMsg(null);
    setResetType('');
    setResetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetType('success');
        setResetMsg(data.message);
        setResetEmail('');
      } else {
        const m = (data.message || '').toLowerCase();
        if (m.includes('not found')) {
          setResetMsg('לא נמצא משתמש עם המייל הזה');
        } else {
          setResetMsg(data.message || 'שגיאה בשליחת המייל, נסי שוב');
        }
        setResetType('error');
      }
    } catch {
      setResetType('error');
      setResetMsg('שגיאה בשרת');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {message && (
        <div className={`${styles.popup} ${styles.error}`} role="alert">
          {message}
        </div>
      )}

      <h1>התחברות</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>אימייל:</label>
        <input
          aria-label="אימייל"
          autoComplete="username"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label>סיסמה:</label>
        <input
          type="password"
          aria-label="סיסמה"
          autoComplete="current-password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className={styles.linkRow}>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => {
              setShowReset(true);
              setResetMsg(null);
              setResetType('');
            }}
          >
            שכחת סיסמה?
          </button>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'מתחברים…' : 'התחבר'}
        </button>
        {googleClientId && (
          <div className={styles.googleOption}>
            <GoogleSignIn clientId={googleClientId} onSuccess={completeLogin} />
          </div>
        )}
      </form>

      {showReset && (
        <div className={styles.modalBackdrop} onClick={() => setShowReset(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setShowReset(false)}
              aria-label="סגירה"
            >
              ×
            </button>

            <h2 style={{ marginTop: 0 }}>איפוס סיסמה</h2>
            <p style={{ marginTop: 0 }}>נא להכניס מייל לצורך שליחת קישור לאיפוס הסיסמה</p>

            <form onSubmit={sendReset} style={{ display: 'grid', gap: 10 }}>
              <input
                type="email"
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                style={{ direction: 'ltr' }}
              />
              <button type="submit" disabled={resetLoading}>
                {resetLoading ? '...שולח' : 'שליחת הקישור לאיפוס'}
              </button>
            </form>

            {resetMsg && (
              <div
                className={`${styles.inlineAlert} ${
                  resetType === 'success' ? styles.success : styles.error
                }`}
                style={{ marginTop: 12 }}
              >
                {resetMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
