import { useState } from 'react';
import { Link } from 'react-router-dom';
import { featuredRecipes } from '../../data/featuredRecipes';
import styles from '../../styles/Discovery.module.css';

const initial = featuredRecipes.slice(0, 2);
const blank = { title: '', ingredients: '', steps: '' };
const toLines = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export default function Demo() {
  const [recipes, setRecipes] = useState(initial);
  const [favorites, setFavorites] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [notice, setNotice] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);

  function edit(recipe) {
    setEditing(recipe._id);
    setForm({
      title: recipe.title,
      ingredients: recipe.ingredients.join('\n'),
      steps: recipe.steps.join('\n'),
    });
    setNotice('');
  }

  function save(event) {
    event.preventDefault();
    const title = form.title.trim();
    const ingredients = toLines(form.ingredients);
    const steps = toLines(form.steps);
    if (!title || !ingredients.length || !steps.length) return;
    const payload = { title, ingredients, steps };
    if (editing) {
      setRecipes((current) =>
        current.map((recipe) => (recipe._id === editing ? { ...recipe, ...payload } : recipe))
      );
    } else {
      const id = crypto.randomUUID();
      setRecipes((current) => [...current, { ...payload, _id: id }]);
      setOnlySaved(false);
    }
    setNotice(editing ? 'השינויים נשמרו בהדגמה' : 'המתכון נוסף להדגמה');
    setEditing(null);
    setForm(blank);
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>הדגמה בלי הרשמה</p>
        <h1>התנסות במטבח</h1>
        <p>אפשר להוסיף מתכון, לערוך אותו ולשמור מועדפים. השינויים זמניים ונשארים במסך ההדגמה.</p>
        <Link className={styles.textLink} to="/community">
          לראות את הקהילה החיה
        </Link>
      </header>
      <form className={styles.panel} onSubmit={save}>
        <h2>{editing ? 'עריכת מתכון בהדגמה' : 'הוספת מתכון להדגמה'}</h2>
        <label htmlFor="demo-title">שם המתכון</label>
        <input
          id="demo-title"
          value={form.title}
          maxLength={100}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />
        <label htmlFor="demo-ingredients">מצרכים</label>
        <textarea
          id="demo-ingredients"
          value={form.ingredients}
          rows={2}
          onChange={(event) => setForm({ ...form, ingredients: event.target.value })}
          required
        />
        <label htmlFor="demo-steps">שלבי הכנה</label>
        <textarea
          id="demo-steps"
          value={form.steps}
          rows={2}
          onChange={(event) => setForm({ ...form, steps: event.target.value })}
          required
        />
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!form.title.trim() || !form.ingredients.trim() || !form.steps.trim()}
          >
            שמירה בהדגמה
          </button>
          {editing && (
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              ביטול
            </button>
          )}
        </div>
        {notice && <p role="status">{notice}</p>}
      </form>
      <div className={styles.demoList}>
        <div className={styles.actions}>
          <h2>{onlySaved ? 'המועדפים בהדגמה' : 'המתכונים בהדגמה'}</h2>
          <button
            className={styles.secondary}
            type="button"
            aria-pressed={onlySaved}
            onClick={() => setOnlySaved(!onlySaved)}
          >
            {onlySaved ? 'כל המתכונים בהדגמה' : 'הצגת מועדפים'}
          </button>
        </div>
        <div className={styles.resultGrid}>
          {recipes
            .filter((recipe) => !onlySaved || favorites.includes(recipe._id))
            .map((recipe) => {
              const saved = favorites.includes(recipe._id);
              return (
                <article className={styles.panel} key={recipe._id}>
                  <h3>{recipe.title}</h3>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => edit(recipe)}>
                      עריכה
                    </button>
                    <button
                      className={styles.secondary}
                      type="button"
                      aria-pressed={saved}
                      onClick={() =>
                        setFavorites((current) =>
                          saved
                            ? current.filter((id) => id !== recipe._id)
                            : [...current, recipe._id]
                        )
                      }
                    >
                      {saved ? 'הסרה ממועדפים' : 'שמירה למועדפים'}
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
        {onlySaved && !favorites.length && <p>עדיין לא נשמרו מתכונים בהדגמה.</p>}
      </div>
    </section>
  );
}
