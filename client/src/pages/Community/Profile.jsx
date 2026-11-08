import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { communityRequest } from '../../services/community';
import RecipeCard from '../../components/RecipeCard';
import styles from '../../styles/Discovery.module.css';

export default function Profile() {
  const { id: profileId } = useParams();
  const id = profileId.toLowerCase();
  const { token, isAuth, user } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setError('');
    setNotice('');
    communityRequest(`/people/${encodeURIComponent(id)}`, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setProfile(data);
          setUsername(data.person.username ?? '');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [id, token]);

  const toggleFollow = async () => {
    setBusy(true);
    setError('');
    try {
      const { isFollowing } = await communityRequest(`/people/${encodeURIComponent(id)}/follow`, {
        token,
        method: profile.isFollowing ? 'DELETE' : 'PUT',
      });
      setProfile((current) => (current?.person.id === id ? { ...current, isFollowing } : current));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveUsername = async (event) => {
    event.preventDefault();
    if (busy || username === (profile.person.username ?? '')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { person } = await communityRequest('/profile', {
        token,
        method: 'PATCH',
        body: { username },
      });
      setProfile((current) =>
        current?.person.id === person.id ? { ...current, person } : current
      );
      setUsername(person.username ?? '');
      setNotice('שם המשתמש עודכן');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.page}>
      <Link className={styles.textLink} to="/community">
        חזרה לקהילה
      </Link>
      {error && (
        <p role="alert" className={styles.panel}>
          {error}
        </p>
      )}
      {!profile && !error && <p role="status">טוענים את הפרופיל…</p>}
      {profile && (
        <>
          <header className={styles.pageHeader}>
            <p className={styles.kicker}>פרופיל בקהילה</p>
            <h1>{profile.person.firstName}</h1>
            {profile.person.username && (
              <p>
                <bdi className={styles.handle} dir="ltr">
                  @{profile.person.username}
                </bdi>
              </p>
            )}
            {user?.id === profile.person.id ? (
              <Link className={styles.textLink} to="/dashboard">
                ניהול המתכונים שלי
              </Link>
            ) : isAuth ? (
              <button
                type="button"
                disabled={busy}
                aria-pressed={profile.isFollowing}
                onClick={toggleFollow}
              >
                {busy ? 'מעדכנים…' : profile.isFollowing ? 'הפסקת מעקב' : 'לעקוב'}
              </button>
            ) : (
              <Link className={styles.textLink} to="/login" state={{ from: location }}>
                התחברו כדי לעקוב
              </Link>
            )}
          </header>
          {user?.id === profile.person.id && (
            <form className={styles.panel} onSubmit={saveUsername}>
              <label htmlFor="profile-username">שם משתמש בקהילה</label>
              <input
                id="profile-username"
                dir="ltr"
                maxLength={25}
                autoComplete="off"
                value={username}
                disabled={busy}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setNotice('');
                }}
              />
              <small>
                3-24 אותיות באנגלית, ספרות או קו תחתון. שם המשתמש והשם הפרטי יופיעו בחיפוש. אפשר
                להשאיר ריק כדי להסיר את שם המשתמש.
              </small>
              <div className={styles.actions}>
                <button
                  type="submit"
                  disabled={busy || username === (profile.person.username ?? '')}
                  aria-busy={busy}
                >
                  {busy ? 'שומרים…' : notice ? 'נשמר' : 'שמירת שם משתמש'}
                </button>
              </div>
              {notice && <p role="status">{notice}</p>}
            </form>
          )}
          <h2>מתכונים ציבוריים</h2>
          {profile.recipes.length ? (
            <div className={styles.resultGrid}>
              {profile.recipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
          ) : (
            <p className={styles.panel}>עדיין אין כאן מתכונים ציבוריים.</p>
          )}
        </>
      )}
    </section>
  );
}
