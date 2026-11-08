import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { communityRequest } from '../../services/community';
import Avatar from '../../components/Avatar';
import CommunityPost from '../../components/CommunityPost';
import shared from '../../styles/Discovery.module.css';
import styles from './Community.module.css';

function useCommunityData(path, token) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    communityRequest(path, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setResult({ path, error: err.message });
      });
    return () => controller.abort();
  }, [path, token, attempt]);

  const current = result?.path === path ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    retry: () => {
      setResult(null);
      setAttempt((value) => value + 1);
    },
    refresh: () => setAttempt((value) => value + 1),
    setData: (data) => setResult({ path, data }),
  };
}

function LoadError({ error, onRetry }) {
  return (
    <div className={styles.message} role="alert">
      <p>{error}</p>
      <button type="button" onClick={onRetry}>
        נסו שוב
      </button>
    </div>
  );
}

function RecipePosts({ recipes }) {
  return (
    <div className={styles.posts}>
      {recipes.map((recipe) => (
        <CommunityPost key={recipe._id} recipe={recipe} />
      ))}
    </div>
  );
}

function PeopleDirectory({ user, following, onFollow, busyId, followError, retryFollowing }) {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const directory = useCommunityData('/people?q=' + encodeURIComponent(query));

  return (
    <section aria-labelledby="people-heading">
      <div className={styles.sectionHeading}>
        <h2 id="people-heading">חיפוש אנשים</h2>
        <p>חפשו לפי שם או שם משתמש ועקבו אחרי מי שמעניין אתכם.</p>
      </div>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(input.trim());
        }}
      >
        <input
          type="search"
          aria-label="חיפוש לפי שם או שם משתמש"
          placeholder="שם או @שם_משתמש"
          value={input}
          maxLength={80}
          onChange={(event) => {
            setInput(event.target.value);
            if (!event.target.value) setQuery('');
          }}
        />
        <button type="submit">חיפוש</button>
      </form>
      {followError && <LoadError error={followError} onRetry={retryFollowing} />}
      {!user && (
        <p className={styles.hint}>
          <Link className={shared.textLink} to="/login" state={{ from: location }}>
            התחברו כדי לעקוב
          </Link>
        </p>
      )}
      {directory.error ? (
        <LoadError error={directory.error} onRetry={directory.retry} />
      ) : !directory.data ? (
        <p role="status">טוענים את רשימת האנשים…</p>
      ) : directory.data.people.length ? (
        <ul className={styles.directory}>
          {directory.data.people.map((person) => {
            const ownProfile = user?.id === person.id;
            const followed = following?.some(({ id }) => id === person.id) ?? false;
            return (
              <li key={person.id} className={styles.personRow}>
                <Link to={'/people/' + person.id} className={styles.personIdentity}>
                  <Avatar person={person} size={42} />
                  <span>
                    <strong>{person.firstName}</strong>
                    {person.username && <bdi dir="ltr">@{person.username}</bdi>}
                  </span>
                </Link>
                {ownProfile ? (
                  <span className={styles.hint}>הפרופיל שלי</span>
                ) : (
                  user && (
                    <button
                      type="button"
                      className={followed ? styles.followingButton : styles.followButton}
                      disabled={!following || Boolean(busyId)}
                      aria-busy={busyId === person.id}
                      aria-label={(followed ? 'הפסקת מעקב אחרי ' : 'מעקב אחרי ') + person.firstName}
                      onClick={() => onFollow(person, followed)}
                    >
                      {busyId === person.id ? 'מעדכנים…' : followed ? 'במעקב' : 'לעקוב'}
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.message}>
          {query ? 'לא נמצאו אנשים שמתאימים לחיפוש.' : 'עדיין אין פרופילים להצגה.'}
        </p>
      )}
    </section>
  );
}

function CommunityViews({ user, token }) {
  const [params] = useSearchParams();
  const view = params.get('view');
  const currentView = view === 'people' || view === 'discover' ? view : user ? 'feed' : 'discover';
  const [busyId, setBusyId] = useState('');
  const [followError, setFollowError] = useState('');
  const feed = useCommunityData(user ? '/feed' : null, token);
  const emptyFeed = currentView === 'feed' && feed.data?.recipes.length === 0;
  const discover = useCommunityData(
    currentView === 'discover' || emptyFeed ? '/discover' : null,
    token
  );

  async function toggleFollow(person, followed) {
    if (!feed.data || busyId) return;
    setBusyId(person.id);
    setFollowError('');
    try {
      const { isFollowing } = await communityRequest('/people/' + person.id + '/follow', {
        token,
        method: followed ? 'DELETE' : 'PUT',
      });
      const following = feed.data.following.filter(({ id }) => id !== person.id);
      feed.setData({
        following: isFollowing ? [...following, person] : following,
        recipes: isFollowing
          ? feed.data.recipes
          : feed.data.recipes.filter((recipe) => recipe.createdBy !== person.id),
      });
      feed.refresh();
    } catch (err) {
      setFollowError(err.message);
    } finally {
      setBusyId('');
    }
  }

  const recentPosts = discover.error ? (
    <LoadError error={discover.error} onRetry={discover.retry} />
  ) : !discover.data ? (
    <p role="status">טוענים מתכונים מהקהילה…</p>
  ) : discover.data.recipes.length ? (
    <RecipePosts recipes={discover.data.recipes} />
  ) : (
    <p className={styles.message}>עדיין אין מתכונים שפורסמו בקהילה.</p>
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          {user && <p className={shared.kicker}>היי, {user.firstName}</p>}
          <h1>{user ? 'הפיד שלי' : 'קהילת המתכונים'}</h1>
          <p>
            {user ? 'מתכונים מהאנשים שבחרת לעקוב אחריהם.' : 'מתכונים ביתיים ואנשים שאוהבים לבשל.'}
          </p>
        </div>
        {user ? (
          <Link className={shared.primaryLink} to="/add">
            הוספת מתכון
          </Link>
        ) : (
          <Link className={shared.primaryLink} to="/login">
            התחברות
          </Link>
        )}
      </header>

      <nav className={styles.views} aria-label="תצוגות הקהילה">
        {user && (
          <Link to="/community" aria-current={currentView === 'feed' ? 'page' : undefined}>
            במעקב
          </Link>
        )}
        <Link
          to="/community?view=discover"
          aria-current={currentView === 'discover' ? 'page' : undefined}
        >
          לגלות מתכונים
        </Link>
        <Link
          to="/community?view=people"
          aria-current={currentView === 'people' ? 'page' : undefined}
        >
          חיפוש אנשים
        </Link>
      </nav>

      {currentView === 'people' ? (
        <PeopleDirectory
          user={user}
          following={feed.data?.following}
          onFollow={toggleFollow}
          busyId={busyId}
          followError={followError || feed.error}
          retryFollowing={() => {
            setFollowError('');
            feed.refresh();
          }}
        />
      ) : currentView === 'discover' ? (
        <section aria-labelledby="discover-heading">
          <div className={styles.sectionHeading}>
            <h2 id="discover-heading">חדשים בקהילה</h2>
          </div>
          {recentPosts}
        </section>
      ) : feed.error ? (
        <LoadError error={feed.error} onRetry={feed.retry} />
      ) : !feed.data ? (
        <p role="status">טוענים את הפיד…</p>
      ) : (
        <section aria-labelledby="feed-heading">
          <div className={styles.sectionHeading}>
            <h2 id="feed-heading">מתכונים במעקב</h2>
            <Link className={shared.textLink} to="/community?view=people">
              למצוא אנשים
            </Link>
          </div>
          {emptyFeed ? (
            <>
              <div className={styles.message}>
                <p>
                  {feed.data.following.length
                    ? 'כאן יופיעו מתכונים חדשים מאנשים שבמעקב שלך.'
                    : 'כדאי להתחיל בחיפוש אנשים שמבשלים דברים שאוהבים.'}
                </p>
              </div>
              <div className={styles.sectionHeading}>
                <h2>בינתיים, חדשים בקהילה</h2>
              </div>
              {recentPosts}
            </>
          ) : (
            <RecipePosts recipes={feed.data.recipes} />
          )}
        </section>
      )}
    </section>
  );
}

export default function Community() {
  const { user, token, isAuth, checking } = useAuth();
  if (checking && !user) return <p role="status">בודקים את ההתחברות…</p>;
  return (
    <CommunityViews
      key={isAuth ? user.id : 'guest'}
      user={isAuth ? user : null}
      token={isAuth ? token : undefined}
    />
  );
}
