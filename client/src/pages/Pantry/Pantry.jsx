import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import starterRecipes from '../../data/starterRecipes.json';
import { matchRecipes } from '../../services/pantry';
import { fetchRecipes } from '../../services/recipes';
import styles from '../../styles/Discovery.module.css';

const examples = starterRecipes.map((recipe) => ({ ...recipe, example: true }));
const sampleInventory = 'מלפפון, עגבנייה, פלפל אדום, בצל סגול, פטרוזיליה, שמן זית, מיץ לימון, מלח';

export default function Pantry() {
  const [inventory, setInventory] = useState('');
  const [query, setQuery] = useState('');
  const [community, setCommunity] = useState(null);
  const [maxMinutes, setMaxMinutes] = useState('');

  useEffect(() => {
    let active = true;
    fetchRecipes()
      .then((recipes) => {
        if (active) setCommunity(recipes);
      })
      .catch(() => {
        if (active) setCommunity([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const recipes = useMemo(() => {
    const live = (community ?? []).map((recipe) => {
      const example = !recipe.createdBy && examples.find((item) => item.title === recipe.title);
      return example && !recipe.totalMinutes
        ? { ...recipe, totalMinutes: example.totalMinutes }
        : recipe;
    });
    return [
      ...live,
      ...examples.filter(
        (example) => !live.some((recipe) => !recipe.createdBy && recipe.title === example.title)
      ),
    ];
  }, [community]);
  const matches = useMemo(() => matchRecipes(recipes, query), [recipes, query]);
  const results = maxMinutes
    ? matches.filter(
        ({ recipe }) => recipe.totalMinutes && recipe.totalMinutes <= Number(maxMinutes)
      )
    : matches;

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>מחפשים רעיון לארוחה</p>
        <h1>מה יש במקרר?</h1>
        <p>כתבו מה יש בבית וגלו מה אפשר להכין, מה חסר וכמה זמן זה ייקח.</p>
      </header>
      <form
        className={styles.panel}
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(inventory.trim());
        }}
      >
        <label htmlFor="inventory">המצרכים שיש לי</label>
        <textarea
          id="inventory"
          value={inventory}
          onChange={(event) => setInventory(event.target.value)}
          placeholder="למשל עגבניות, ביצים, קמח"
          maxLength={1500}
          rows={3}
          required
        />
        <small>
          הפרידו בין מצרכים בפסיק או בשורה חדשה. ההתאמה מבוססת על שמות, בלי לבדוק כמויות.
        </small>
        <div className={styles.actions}>
          <button type="submit" disabled={!inventory.trim()}>
            מצאו לי מתכונים
          </button>
          <button
            className={styles.secondary}
            type="button"
            onClick={() => {
              setInventory(sampleInventory);
              setQuery(sampleInventory);
              setMaxMinutes('');
            }}
          >
            נסו עם מצרכים לדוגמה
          </button>
        </div>
      </form>
      {query && (
        <section aria-labelledby="matches-heading">
          <div className={styles.sectionHeader}>
            <h2 id="matches-heading">מה אפשר להכין</h2>
            <label>
              זמן כולל{' '}
              <select value={maxMinutes} onChange={(event) => setMaxMinutes(event.target.value)}>
                <option value="">כל הזמנים</option>
                <option value="20">עד 20 דקות</option>
                <option value="40">עד 40 דקות</option>
                <option value="60">עד שעה</option>
              </select>
            </label>
          </div>
          {community === null && (
            <p role="status">מתכוני הקהילה עדיין נטענים. אפשר להתחיל עם הדוגמאות.</p>
          )}
          {!results.length && (
            <p className={styles.panel}>לא נמצאה התאמה. נסו להוסיף מצרך או לשנות את מגבלת הזמן.</p>
          )}
          <div className={styles.resultGrid}>
            {results.map(({ recipe, missing, matched }) => (
              <article className={styles.result} key={recipe._id ?? recipe.title}>
                {recipe.imageUrl && (
                  <img className={styles.resultImage} src={recipe.imageUrl} alt="" loading="lazy" />
                )}
                <div className={styles.resultBody}>
                  <p className={styles.kicker}>
                    {recipe.example ? 'מתכון לדוגמה' : recipe.category}
                  </p>
                  <h3>{recipe.title}</h3>
                  <p>
                    {recipe.totalMinutes ? `כ־${recipe.totalMinutes} דקות` : 'זמן הכנה טרם הוזן'}
                  </p>
                  <p className={styles.match}>
                    {missing.length
                      ? `${matched} מתוך ${recipe.ingredients.length} שורות מצרכים`
                      : 'כל המצרכים אצלך'}
                  </p>
                  {missing.length > 0 && (
                    <details>
                      <summary>מה חסר ({missing.length})</summary>
                      <ul>
                        {missing.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {recipe.example ? (
                    <details>
                      <summary>מצרכים ואופן ההכנה</summary>
                      <ul>
                        {recipe.ingredients.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      <ol>
                        {recipe.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </details>
                  ) : (
                    <Link className={styles.textLink} to={`/recipes/${recipe._id}`}>
                      למתכון המלא ←
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
