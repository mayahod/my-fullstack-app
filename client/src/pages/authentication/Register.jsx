import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import SuccessOverlay from '../../components/common/SuccessOverlay';
import React, { useState } from 'react';
import { API_BASE } from '../../services/config';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const toHebrewError = (message, status) => {
    const m = String(message || '').toLowerCase();
    if (status === 409) return 'משתמש כבר קיים';
    if (m.includes('exist')) return 'משתמש כבר קיים';
    if (status === 400) return message || 'בקשה לא תקינה';
    if (status === 401) return 'אין הרשאה';
    return 'שגיאה בהרשמה';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      //   const data = await res.json();

      //   if (!res.ok) {
      //     setError(toHebrewError(data.message, res.status));
      //     return;
      //   }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(toHebrewError(data?.message, res.status));
        return;
      }

      setShowSuccess(true);
    } catch {
      setError('שגיאה בשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.modalBackdrop} onClick={() => setError(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setError(null)} aria-label="סגירה">
              ×
            </button>
            {error}
          </div>
        </div>
      )}
      {showSuccess && (
        <SuccessOverlay
          title="!נרשמת בהצלחה"
          autoCloseMs={3000}
          onClose={() => setShowSuccess(false)}
          goNext={() => navigate('/login', { replace: true })}
        />
      )}

      <h1>הרשמה</h1>
      <form className={styles.form} onSubmit={onSubmit}>
        <label>:שם פרטי</label>
        <input aria-label="שם פרטי" autoComplete="given-name" name="firstName" maxLength={100} value={form.firstName} onChange={onChange} required />
        <label>:שם משפחה</label>
        <input aria-label="שם משפחה" autoComplete="family-name" name="lastName" maxLength={100} value={form.lastName} onChange={onChange} required />
        <label>:אימייל</label>
        <input aria-label="אימייל" autoComplete="email" type="email" name="email" value={form.email} onChange={onChange} required />
        <label>:סיסמה</label>
        <input aria-label="סיסמה" autoComplete="new-password" type="password" name="password" minLength={8} value={form.password} onChange={onChange} required />
        <small>לפחות 8 תווים</small>
        <button type="submit" disabled={loading}>{loading ? 'נרשמים…' : 'הרשמי'}</button>
      </form>
    </div>
  );
}
