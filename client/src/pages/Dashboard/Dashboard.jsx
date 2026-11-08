import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMyRecipes, updateMyRecipe, deleteMyRecipe } from '../../services/recipes';
import styles from './Dashboard.module.css';
import { difficulties } from '../../data/recipeOptions';
import RecipeImage from '../../components/RecipeImage';
import GoogleSignIn from '../../components/GoogleSignIn';
import useGoogleClientId from '../../context/useGoogleClientId';

function Dashboard() {
  const { token, logout, user, login } = useAuth();
  const location = useLocation();
  const googleClientId = useGoogleClientId();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchMyRecipes(token, controller.signal)
      .then((data) => setRecipes(data.recipes))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 401) logout();
        else setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, retry, logout]);

  const edit = (recipe) => {
    setEditing(recipe._id);
    setError('');
    setNotice('');
    setForm({
      title: recipe.title,
      category: recipe.category,
      imageUrl: recipe.imageUrl || '',
      totalMinutes: recipe.totalMinutes ?? '',
      difficulty: recipe.difficulty ?? '',
      isPublic: recipe.isPublic !== false,
      ingredients: recipe.ingredients.join('\n'),
      steps: recipe.steps.join('\n'),
    });
  };
  const change = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]:
        event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await updateMyRecipe(
        editing,
        {
          ...form,
          totalMinutes: form.totalMinutes ? Number(form.totalMinutes) : null,
        },
        token
      );
      setRecipes((current) =>
        current.map((recipe) => (recipe._id === editing ? data.recipe : recipe))
      );
      setEditing(null);
      setNotice('השינויים נשמרו בהצלחה');
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await deleteMyRecipe(deleting._id, token);
      setRecipes((current) => current.filter((recipe) => recipe._id !== deleting._id));
      setDeleting(null);
      setNotice('המתכון נמחק');
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.container} dir="rtl">
      <header className={styles.heading}>
        <div>
          <h1>אזור אישי</h1>
          <p>המתכונים שלי</p>
          {user && <Link to={`/people/${user.id}`}>הפרופיל שלי בקהילה</Link>}
          {' · '}
          <Link to="/library">האוספים שלי</Link>
        </div>
        <Link className={styles.primary} to="/add">
          הוספת מתכון
        </Link>
      </header>
      {googleClientId && user && (
        <details className={styles.signInSettings}>
          <summary>הגדרות התחברות</summary>
          {user.googleLinked ? (
            <p role="status">חשבון Google מקושר</p>
          ) : (
            <>
              <p>אפשר לקשר את חשבון Google עם אותה כתובת אימייל.</p>
              <GoogleSignIn
                clientId={googleClientId}
                token={token}
                onSuccess={({ user }) => login(user, token)}
              />
            </>
          )}
        </details>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}{' '}
          {!editing && !deleting && (
            <button onClick={() => setRetry((value) => value + 1)}>נסו שוב</button>
          )}
        </div>
      )}
      {loading ? (
        <p role="status">טוענים את המתכונים…</p>
      ) : !error && recipes.length === 0 ? (
        <div className={styles.empty}>
          <h2>עדיין אין כאן מתכונים</h2>
          <p>הוסיפו מתכון והוא יופיע כאן עם אפשרות לעריכה ולמחיקה.</p>
          <Link to="/add">הוספת המתכון הראשון</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {recipes.map((recipe) => (
            <article className={styles.card} key={recipe._id}>
              <Link to={`/recipes/${recipe._id}`}>
                <RecipeImage src={recipe.imageUrl} thumbnail />
                <h2>{recipe.title}</h2>
              </Link>
              <p>
                {recipe.category} · {recipe.isPublic ? 'ציבורי' : 'פרטי - רק שלך'}
                {recipe.totalMinutes ? ` · כ-${recipe.totalMinutes} דקות` : ''}
              </p>
              <div className={styles.actions}>
                <button onClick={() => edit(recipe)}>עריכה</button>
                <button
                  className={styles.danger}
                  onClick={() => {
                    setError('');
                    setDeleting(recipe);
                  }}
                >
                  מחיקה
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <div className={styles.backdrop}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
          >
            <h2 id="edit-title">עריכת מתכון</h2>
            <form className={styles.form} onSubmit={save}>
              <label>
                שם המתכון
                <input autoFocus name="title" value={form.title} onChange={change} required />
              </label>
              <label>
                קטגוריה
                <select name="category" value={form.category} onChange={change} required>
                  {[...new Set([form.category, 'פסטה', 'מרק', 'סלט', 'לחם', 'קינוח'])].map(
                    (category) => (
                      <option key={category}>{category}</option>
                    )
                  )}
                </select>
              </label>
              <label>
                מצרכים - כל מצרך בשורה נפרדת
                <textarea
                  name="ingredients"
                  rows={5}
                  value={form.ingredients}
                  onChange={change}
                  required
                />
              </label>
              <label>
                אופן ההכנה - כל שלב בשורה נפרדת
                <textarea name="steps" rows={5} value={form.steps} onChange={change} required />
              </label>
              <label>
                קישור לתמונה (לא חובה)
                <input name="imageUrl" value={form.imageUrl} onChange={change} />
              </label>
              <label>
                זמן כולל בדקות (לא חובה)
                <input
                  name="totalMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={form.totalMinutes}
                  onChange={change}
                />
              </label>
              <label>
                רמת קושי (לא חובה)
                <select name="difficulty" value={form.difficulty} onChange={change}>
                  <option value="">בחירה</option>
                  {Object.entries(difficulties).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.visibility}>
                <input type="checkbox" name="isPublic" checked={form.isPublic} onChange={change} />
                לפרסם את המתכון לכולם
              </label>
              <small>ללא סימון, רק לך תהיה גישה למתכון דרך האזור האישי.</small>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <div className={styles.actions}>
                <button type="submit" disabled={busy}>
                  {busy ? 'שומרים…' : 'שמירת שינויים'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    setError('');
                  }}
                >
                  ביטול
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {deleting && (
        <div className={styles.backdrop}>
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <h2 id="delete-title">מחיקת מתכון</h2>
            <p id="delete-description">למחוק את ״{deleting.title}״? לא ניתן לבטל את המחיקה.</p>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button
                autoFocus
                disabled={busy}
                onClick={() => {
                  setDeleting(null);
                  setError('');
                }}
              >
                ביטול
              </button>
              <button className={styles.danger} disabled={busy} onClick={remove}>
                {busy ? 'מוחקים…' : 'מחיקת המתכון'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Dashboard;
