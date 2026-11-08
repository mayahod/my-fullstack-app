import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { communityRequest } from '../../services/community';
import RecipeCard from '../../components/RecipeCard';
import styles from '../../styles/Discovery.module.css';

export default function Community() {
  const { isAuth, token, user } = useAuth();
  const location = useLocation();
  const [people, setPeople] = useState(null);
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setPeople(null);
    setFeed(null);
    setError('');
    const requests = [communityRequest('/people', { signal: controller.signal })];
    if (isAuth) requests.push(communityRequest('/feed', { token, signal: controller.signal }));
    Promise.all(requests)
      .then(([directory, personal]) => {
        if (!controller.signal.aborted) {
          setPeople(directory.people);
          setFeed(personal ?? null);
        }
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
          <Link className={styles.textLink} to="/add">
            פרסום מתכון
          </Link>
          {user && (
            <Link className={styles.textLink} to={`/people/${user.id}`}>
              הפרופיל שלי
            </Link>
          )}
        </div>
      </header>
      {error ? (
        <div className={styles.panel} role="alert">
          {error}
          <button onClick={() => setAttempt((value) => value + 1)}>נסו שוב</button>
        </div>
      ) : (
        <>
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
            ) : !feed ? (
              <p role="status">טוענים את הפיד…</p>
            ) : (
              <>
                {feed.following.length > 0 && (
                  <div className={styles.people} aria-label="פרופילים במעקב">
                    {feed.following.map((person) => (
                      <Link key={person.id} className={styles.person} to={`/people/${person.id}`}>
                        {person.firstName}
                      </Link>
                    ))}
                  </div>
                )}
                {feed.recipes.length === 0 ? (
                  <p className={styles.panel}>
                    הפיד יתמלא כשאנשים שבחרת לעקוב אחריהם יפרסמו מתכונים.
                  </p>
                ) : (
                  <div className={styles.resultGrid}>
                    {feed.recipes.map((recipe) => (
                      <div className={styles.feedCard} key={recipe._id}>
                        <RecipeCard recipe={recipe} />
                        {recipe.author && (
                          <Link className={styles.textLink} to={`/people/${recipe.author.id}`}>
                            {recipe.author.firstName}
                          </Link>
                        )}
                      </div>
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
            {people === null ? (
              <p role="status">טוענים את הקהילה…</p>
            ) : people.length === 0 ? (
              <p className={styles.panel}>כאן יופיעו יוצרים אחרי שיפרסמו מתכון ראשון.</p>
            ) : (
              <div className={styles.people}>
                {people.map((person) => (
                  <Link key={person.id} className={styles.person} to={`/people/${person.id}`}>
                    {person.firstName}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
