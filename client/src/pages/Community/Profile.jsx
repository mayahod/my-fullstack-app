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

  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setError('');
    communityRequest(`/people/${encodeURIComponent(id)}`, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setProfile(data);
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
