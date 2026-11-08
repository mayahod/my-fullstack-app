import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { communityRequest } from '../../services/community';
import Avatar from '../../components/Avatar';
import CommunityPost from '../../components/CommunityPost';
import styles from '../../styles/Discovery.module.css';

function PersonLink({ person }) {
  return (
    <Link className={styles.person} to={`/people/${person.id}`}>
      <Avatar person={person} size={36} />
      <span>
        {person.firstName}
        {person.username && (
          <bdi className={styles.handle} dir="ltr">
            @{person.username}
          </bdi>
        )}
      </span>
    </Link>
  );
}

export default function Community() {
  const { isAuth, token, user } = useAuth();
  const location = useLocation();
  const [people, setPeople] = useState(null);
  const [feed, setFeed] = useState(null);
  const [recent, setRecent] = useState(null);
  const [recentError, setRecentError] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [peopleError, setPeopleError] = useState('');
  const followedPosts = new Set(feed?.recipes.map((recipe) => recipe._id));
  const discoveries = recent?.filter((recipe) => !followedPosts.has(recipe._id));

  useEffect(() => {
    const controller = new AbortController();
    setRecent(null);
    setRecentError('');
    communityRequest('/discover', { token: isAuth ? token : undefined, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRecent(data.recipes);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setRecentError(err.message);
      });
    return () => controller.abort();
  }, [token, isAuth, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    setPeople(null);
    setPeopleError('');
    communityRequest('/people?q=' + encodeURIComponent(search), { signal: controller.signal })
      .then((directory) => {
        if (!controller.signal.aborted) setPeople(directory.people);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setPeopleError(err.message);
      });
    return () => controller.abort();
  }, [search, attempt]);

  useEffect(() => {
    setFeed(null);
    setError('');
    if (!isAuth) return;
    const controller = new AbortController();
    communityRequest('/feed', { token, signal: controller.signal })
      .then((personal) => {
        if (!controller.signal.aborted) setFeed(personal);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [isAuth, token, attempt]);

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>מתכונים מאנשים שאוהבים לבשל</p>
        <h1>קהילת המתכונים</h1>
        <p>גלו יוצרים, עקבו אחריהם וקבלו את המתכונים החדשים שלהם בפיד האישי.</p>
        <div className={styles.actions}>
          {isAuth && (
            <Link className={styles.primaryLink} to="/add">
              פרסום מתכון
            </Link>
          )}
          {user && (
            <Link className={styles.textLink} to={`/people/${user.id}`}>
              הפרופיל שלי
            </Link>
          )}
        </div>
      </header>
      <section aria-labelledby="recent-heading">
        <div className={styles.sectionHeader}>
          <h2 id="recent-heading">חדשים בקהילה</h2>
        </div>
        {recentError ? (
          <div className={styles.panel} role="alert">
            {recentError}
            <button onClick={() => setAttempt((value) => value + 1)}>נסו שוב</button>
          </div>
        ) : recent === null ? (
          <p role="status">טוענים מתכונים מהקהילה…</p>
        ) : discoveries.length ? (
          <div className={styles.resultGrid}>
            {discoveries.map((recipe) => (
              <CommunityPost key={recipe._id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <p className={styles.panel}>
            {recent.length
              ? 'אין כרגע מתכונים נוספים מעבר למה שמופיע בפיד שלך.'
              : 'עדיין אין מתכונים שפורסמו בקהילה.'}
          </p>
        )}
      </section>
      <section aria-labelledby="feed-heading">
        <div className={styles.sectionHeader}>
          <h2 id="feed-heading">הפיד שלי</h2>
        </div>
        {!isAuth ? (
          <div className={styles.panel}>
            <Link className={styles.textLink} to="/login" state={{ from: location }}>
              התחברו כדי לעקוב ולפתוח את הפיד שלכם
            </Link>
          </div>
        ) : error ? (
          <div className={styles.panel} role="alert">
            {error}
            <button onClick={() => setAttempt((value) => value + 1)}>נסו שוב</button>
          </div>
        ) : !feed ? (
          <p role="status">טוענים את הפיד…</p>
        ) : (
          <>
            {feed.following.length > 0 && (
              <div className={styles.people} aria-label="פרופילים במעקב">
                {feed.following.map((person) => (
                  <PersonLink key={person.id} person={person} />
                ))}
              </div>
            )}
            {feed.recipes.length === 0 ? (
              <p className={styles.panel}>הפיד יתמלא כשאנשים שבחרת לעקוב אחריהם יפרסמו מתכונים.</p>
            ) : (
              <div className={styles.resultGrid}>
                {feed.recipes.map((recipe) => (
                  <CommunityPost key={recipe._id} recipe={recipe} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <section aria-labelledby="people-heading">
        <div className={styles.sectionHeader}>
          <h2 id="people-heading">לגלות יוצרים</h2>
        </div>
        <form
          className={styles.personSearch}
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <input
            type="search"
            aria-label="חיפוש לפי שם או שם משתמש"
            placeholder="שם או @שם_משתמש"
            value={searchInput}
            maxLength={80}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit">חיפוש</button>
          {search && (
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
            >
              ניקוי החיפוש
            </button>
          )}
        </form>
        {peopleError ? (
          <div className={styles.panel} role="alert">
            {peopleError}
            <button onClick={() => setAttempt((value) => value + 1)}>נסו שוב</button>
          </div>
        ) : people === null ? (
          <p role="status">טוענים את הקהילה…</p>
        ) : people.length === 0 ? (
          <p className={styles.panel}>
            {search
              ? 'לא נמצאו אנשים שמתאימים לחיפוש.'
              : 'כאן יופיעו אנשים שבחרו שם משתמש או פרסמו מתכון.'}
          </p>
        ) : (
          <div className={styles.people}>
            {people.map((person) => (
              <PersonLink key={person.id} person={person} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
