import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RecipeCard from '../../components/RecipeCard';
import { changeSavedRecipe, libraryRequest } from '../../services/library';
import { shoppingList } from './shoppingList';
import styles from '../../styles/Discovery.module.css';

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function WeeklyPlan({ userId, collections }) {
  const key = 'meal-plan:' + userId;
  const [plan, setPlan] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return Array.isArray(saved) ? saved.slice(0, days.length) : [];
    } catch {
      return [];
    }
  });
  const [storageError, setStorageError] = useState(false);
  const recipes = new Map(
    collections.flatMap((collection) => collection.recipes).map((recipe) => [recipe._id, recipe])
  );
  const selected = plan.map((id) => recipes.get(id)).filter(Boolean);
  const ingredients = shoppingList(selected);

  function pick(index, id) {
    const next = days.map((_, day) => (day === index ? id : plan[day] || ''));
    setPlan(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  return (
    <section className={styles.panel}>
      <h2>תכנון ארוחות לשבוע</h2>
      <p>בחרו מתכון מהאוספים לכל יום. התכנון נשמר בדפדפן הזה.</p>
      <div className={styles.weekPlan}>
        {days.map((day, index) => (
          <label key={day}>
            יום {day}
            <select
              value={recipes.has(plan[index]) ? plan[index] : ''}
              onChange={(event) => pick(index, event.target.value)}
            >
              <option value="">בלי מתכון</option>
              {Array.from(recipes.values(), (recipe) => (
                <option key={recipe._id} value={recipe._id}>
                  {recipe.title}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {storageError && <p role="alert">לא ניתן לשמור את התכנון בדפדפן הזה.</p>}
      <h3>רשימת קניות</h3>
      {ingredients.length ? (
        <ul className={styles.shoppingList}>
          {ingredients.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>רשימת הקניות תופיע אחרי בחירת מתכונים.</p>
      )}
    </section>
  );
}

export default function Library() {
  const { user, token } = useAuth();
  const [collections, setCollections] = useState(null);
  const [active, setActive] = useState('favorites');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const list = collections?.find((collection) => collection.id === active);

  useEffect(() => {
    const controller = new AbortController();
    libraryRequest(token, '', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCollections(data.collections);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [token, attempt]);

  async function create(event) {
    event.preventDefault();
    await run(async () => {
      const added = await libraryRequest(token, '/collections', { method: 'PUT', body: { name } });
      setCollections((current) =>
        current.some(({ id }) => id === added.id)
          ? current
          : [...current, { ...added, recipes: [] }]
      );
      setActive(added.id);
      setName('');
    });
  }

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function removeRecipe(recipeId) {
    return run(async () => {
      await changeSavedRecipe(token, active, recipeId, false);
      setCollections((current) =>
        current.map((collection) =>
          collection.id !== active
            ? collection
            : {
                ...collection,
                recipes: collection.recipes.filter((recipe) => recipe._id !== recipeId),
              }
        )
      );
    });
  }

  function removeCollection() {
    if (!window.confirm('למחוק את האוסף? המתכונים עצמם יישארו באתר.')) return;
    return run(async () => {
      await libraryRequest(token, '/collections/' + active, { method: 'DELETE' });
      setCollections((current) => current.filter(({ id }) => id !== active));
      setActive('favorites');
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>האוספים שלי</h1>
        <p>מתכונים ששמרת ותכנון ארוחות לשבוע.</p>
      </header>
      {error && (
        <p role="alert" className={styles.chatError}>
          {error}
        </p>
      )}
      {!collections ? (
        error ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            נסו שוב
          </button>
        ) : (
          <p role="status">טוענים אוספים…</p>
        )
      ) : (
        <>
          <section className={styles.panel}>
            <form className={styles.actions} onSubmit={create}>
              <label>
                שם לאוסף חדש{' '}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={60}
                />
              </label>
              <button type="submit" disabled={busy || !name.trim()}>
                יצירת אוסף
              </button>
            </form>
            <div className={styles.actions}>
              <label>
                הצגת אוסף{' '}
                <select
                  value={active}
                  disabled={busy}
                  onChange={(event) => setActive(event.target.value)}
                >
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
              {active !== 'favorites' && (
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={busy}
                  onClick={removeCollection}
                >
                  מחיקת אוסף
                </button>
              )}
            </div>
            {list?.recipes.length ? (
              <div className={styles.resultGrid}>
                {list.recipes.map((recipe) => (
                  <div className={styles.feedCard} key={recipe._id}>
                    <RecipeCard recipe={recipe} variant="post" />
                    <div className={styles.postActions}>
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() => removeRecipe(recipe._id)}
                      >
                        הסרה מהאוסף
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>
                האוסף הזה עדיין ריק. אפשר לשמור מתכון מעמוד המתכון. <Link to="/">לכל המתכונים</Link>
              </p>
            )}
          </section>
          <WeeklyPlan key={user.id} userId={user.id} collections={collections} />
        </>
      )}
    </section>
  );
}
