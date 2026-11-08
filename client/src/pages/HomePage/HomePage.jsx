import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import RecipeCard from '../../components/RecipeCard';
import { featuredRecipes } from '../../data/featuredRecipes';
import { categories, difficulties } from '../../data/recipeOptions';
import { searchRecipes } from '../../services/recipes';
import styles from './Home.module.css';

function CatalogFilters({ params, onSubmit }) {
  return (
    <form
      className={styles.catalogFilters}
      onSubmit={onSubmit}
      role="search"
      aria-label="חיפוש מתכונים"
    >
      <label className={styles.catalogSearch}>
        חיפוש לפי שם או מצרך
        <input
          type="search"
          name="q"
          defaultValue={params.get('q') || params.get('query') || ''}
          placeholder="למשל פסטה או עגבניות"
          maxLength={160}
        />
      </label>
      <label>
        מצרכים נוספים
        <input
          name="ingredients"
          defaultValue={params.get('ingredients') || ''}
          placeholder="מופרדים בפסיקים"
          maxLength={160}
        />
      </label>
      <label>
        קטגוריה
        <select name="category" defaultValue={params.get('category') || ''}>
          <option value="">הכול</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <label>
        זמן מרבי בדקות
        <input
          name="maxMinutes"
          type="number"
          min="1"
          max="1440"
          defaultValue={params.get('maxMinutes') || ''}
          placeholder="ללא הגבלה"
        />
      </label>
      <label>
        רמת קושי
        <select name="difficulty" defaultValue={params.get('difficulty') || ''}>
          <option value="">הכול</option>
          <option value="unrated">לא צוינה</option>
          {Object.entries(difficulties).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        מיון
        <select name="sort" defaultValue={params.get('sort') || 'newest'}>
          <option value="newest">חדשים קודם</option>
          <option value="oldest">ישנים קודם</option>
          <option value="name">שם (א-ת)</option>
          <option value="nameDesc">שם (ת-א)</option>
          <option value="quickest">המהירים ביותר</option>
        </select>
      </label>
      <div className={styles.catalogActions}>
        <button type="submit">חיפוש</button>
        <Link to="/">איפוס</Link>
      </div>
    </form>
  );
}

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const query = params.toString();
  const current = result?.query === query ? result : null;
  const data = current?.data;
  const list = data?.recipes ?? (query ? [] : featuredRecipes);

  useEffect(() => {
    const controller = new AbortController();
    const options = new URLSearchParams(query);
    if (options.has('query') && !options.has('q')) options.set('q', options.get('query'));
    options.delete('query');
    searchRecipes(options, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ query, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ query, error: error.message });
      });
    return () => controller.abort();
  }, [query, attempt]);

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (value.trim() && (key !== 'sort' || value !== 'newest')) next.set(key, value.trim());
    }
    setParams(next);
  }

  function page(number) {
    const next = new URLSearchParams(params);
    if (number === 1) next.delete('page');
    else next.set('page', String(number));
    setParams(next);
  }

  return (
    <section className={styles.home}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>מבשלים בבית</p>
          <h1 className={styles.headline}>כל המתכונים</h1>
        </div>
        <div className={styles.catalogActions}>
          <Link to="/demo">התנסות בלי הרשמה</Link>
          <Link to="/add" className={styles.addButton}>
            הוספת מתכון
          </Link>
        </div>
      </header>
      <CatalogFilters key={query} params={params} onSubmit={submit} />
      {current?.error ? (
        <div className={styles.status} role="alert">
          <p>{current.error}</p>
          <button
            onClick={() => {
              setResult(null);
              setAttempt((value) => value + 1);
            }}
          >
            נסו שוב
          </button>
        </div>
      ) : !current ? (
        <p className={styles.catalogStatus} role="status">
          {list.length ? 'מציגים מתכונים נבחרים בזמן שהקטלוג נטען…' : 'מחפשים מתכונים…'}
        </p>
      ) : data.total ? (
        <p className={styles.catalogStatus} role="status">
          {data.total} מתכונים נמצאו
        </p>
      ) : null}
      {data && !list.length && (
        <p className={styles.status}>לא נמצאו מתכונים. אפשר לשנות את החיפוש או להסיר סינון.</p>
      )}
      <div className={styles.grid}>
        {list.map((recipe, index) => (
          <RecipeCard key={recipe._id} recipe={recipe} eager={index < 2} />
        ))}
      </div>
      {data && (data.total > data.pageSize || data.page > 1) && (
        <nav className={styles.pagination} aria-label="עמודי מתכונים">
          <button disabled={data.page === 1} onClick={() => page(data.page - 1)}>
            הקודם
          </button>
          <span>
            עמוד {data.page} מתוך {Math.max(1, Math.ceil(data.total / data.pageSize))}
          </span>
          <button
            disabled={data.page * data.pageSize >= data.total || data.page >= 500}
            onClick={() => page(data.page + 1)}
          >
            הבא
          </button>
        </nav>
      )}
    </section>
  );
}
