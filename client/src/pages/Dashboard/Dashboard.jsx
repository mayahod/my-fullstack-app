// client/src/pages/Dashboard/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMyRecipes, updateMyRecipe, deleteMyRecipe } from '../../services/recipes';
import styles from './Dashboard.module.css';

function Dashboard() {
  const { token, logout } = useAuth();
  const location = useLocation();
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
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, retry]);

  const edit = (recipe) => {
    setEditing(recipe._id);
    setError('');
    setNotice('');
    setForm({ title: recipe.title, category: recipe.category, imageUrl: recipe.imageUrl,
      ingredients: recipe.ingredients.join('\n'), steps: recipe.steps.join('\n') });
  };
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const data = await updateMyRecipe(editing, form, token);
      setRecipes((current) => current.map((recipe) => recipe._id === editing ? data.recipe : recipe));
      setEditing(null); setNotice('השינויים נשמרו בהצלחה');
    } catch (err) { if (err.status === 401) logout(); else setError(err.message); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await deleteMyRecipe(deleting._id, token);
      setRecipes((current) => current.filter((recipe) => recipe._id !== deleting._id));
      setDeleting(null); setNotice('המתכון נמחק');
    } catch (err) { if (err.status === 401) logout(); else setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <section className={styles.container} dir="rtl">
      <header className={styles.heading}>
        <div><h1>אזור אישי</h1><p>המתכונים שלי</p></div>
        <Link className={styles.primary} to="/add">הוספת מתכון</Link>
      </header>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <div className={styles.error} role="alert">{error} {!editing && !deleting && <button onClick={() => setRetry((value) => value + 1)}>נסו שוב</button>}</div>}
      {loading ? <p role="status">טוענים את המתכונים…</p> : !error && recipes.length === 0 ? (
        <div className={styles.empty}><h2>עדיין אין כאן מתכונים</h2><p>הוסיפו מתכון והוא יופיע כאן עם אפשרות לעריכה ולמחיקה.</p><Link to="/add">הוספת המתכון הראשון</Link></div>
      ) : (
        <div className={styles.grid}>{recipes.map((recipe) => (
          <article className={styles.card} key={recipe._id}>
            <Link to={`/recipes/${recipe._id}`}><img src={recipe.imageUrl} alt={recipe.title} /><h2>{recipe.title}</h2></Link>
            <p>{recipe.category}</p>
            <div className={styles.actions}><button onClick={() => edit(recipe)}>עריכה</button><button className={styles.danger} onClick={() => { setError(''); setDeleting(recipe); }}>מחיקה</button></div>
          </article>
        ))}</div>
      )}
      {editing && <div className={styles.backdrop}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <h2 id="edit-title">עריכת מתכון</h2>
        <form className={styles.form} onSubmit={save}>
          <label>שם המתכון<input autoFocus name="title" value={form.title} onChange={change} required /></label>
          <label>קטגוריה<select name="category" value={form.category} onChange={change} required>{[...new Set([form.category, 'פסטה', 'מרק', 'סלט', 'לחם', 'קינוח'])].map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>מצרכים — כל מצרך בשורה נפרדת<textarea name="ingredients" rows={5} value={form.ingredients} onChange={change} required /></label>
          <label>אופן ההכנה — כל שלב בשורה נפרדת<textarea name="steps" rows={5} value={form.steps} onChange={change} required /></label>
          <label>קישור לתמונה<input name="imageUrl" value={form.imageUrl} onChange={change} required /></label>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.actions}><button type="submit" disabled={busy}>{busy ? 'שומרים…' : 'שמירת שינויים'}</button><button type="button" disabled={busy} onClick={() => { setEditing(null); setError(''); }}>ביטול</button></div>
        </form>
      </section></div>}
      {deleting && <div className={styles.backdrop}><section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <h2 id="delete-title">מחיקת מתכון</h2><p id="delete-description">למחוק את ״{deleting.title}״? לא ניתן לבטל את המחיקה.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><button autoFocus disabled={busy} onClick={() => { setDeleting(null); setError(''); }}>ביטול</button><button className={styles.danger} disabled={busy} onClick={remove}>{busy ? 'מוחקים…' : 'מחיקת המתכון'}</button></div>
      </section></div>}
    </section>
  );
}

export default Dashboard;
