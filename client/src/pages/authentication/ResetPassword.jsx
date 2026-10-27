import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../../services/config';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';

export default function ResetPassword() {
  // A fragment keeps the reset secret out of HTTP access logs and referrers.
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { logout } = useAuth();
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password !== confirmation) { setError('הסיסמאות אינן תואמות'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || 'לא ניתן לאפס את הסיסמה כרגע'); return; }
      logout();
      window.history.replaceState(null, '', '/reset-password');
      setPassword(''); setConfirmation(''); setSuccess(data.message);
    } catch { setError('לא ניתן להתחבר לשרת. נסו שוב.'); }
    finally { setBusy(false); }
  };
  return <section className={styles.container} dir="rtl">
    <h1>בחירת סיסמה חדשה</h1>
    {success ? <div role="status"><p>{success}</p><Link to="/login">להתחברות</Link></div> : !/^[a-f0-9]{64}$/.test(token) ?
      <div role="alert"><p>קישור האיפוס חסר או אינו תקין.</p><Link to="/login">בקשת קישור חדש דרך ״שכחת סיסמה״</Link></div> :
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor="new-password">סיסמה חדשה — לפחות 8 תווים</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        <label htmlFor="confirm-password">אימות הסיסמה החדשה</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'שומרים…' : 'שמירת סיסמה חדשה'}</button>
        <Link to="/login">חזרה להתחברות</Link>
      </form>}
  </section>;
}
