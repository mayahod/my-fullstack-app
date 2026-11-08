import { useState } from 'react';
import RecipeCard from '../../components/RecipeCard';
import { searchRecipes } from '../../services/recipes';
import styles from '../../styles/Discovery.module.css';

export default function IngredientMatches({ askAssistant }) {
  const [ingredients, setIngredients] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function find(event) {
    event.preventDefault();
    if (!ingredients.trim() || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams({
        ingredients: ingredients.trim(),
        sort: 'match',
        pageSize: '6',
      });
      const data = await searchRecipes(params);
      setResult(data.recipes);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="ingredient-title">
      <h2 id="ingredient-title">מתכונים מהקטלוג שמתאימים למה שיש בבית</h2>
      <form className={styles.chatForm} onSubmit={find}>
        <label htmlFor="pantry-ingredients">מצרכים, מופרדים בפסיקים</label>
        <input
          id="pantry-ingredients"
          value={ingredients}
          maxLength={160}
          placeholder="עגבניות, ביצים, בצל"
          onChange={(event) => setIngredients(event.target.value)}
        />
        <div className={styles.actions}>
          <button type="submit" disabled={busy || !ingredients.trim()} aria-busy={busy}>
            {busy ? 'מחפשים…' : 'התאמת מתכונים'}
          </button>
          <button
            className={styles.secondary}
            type="button"
            disabled={!ingredients.trim()}
            onClick={() => askAssistant(ingredients.trim())}
          >
            לשאול את עוזר הבישול
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className={styles.chatError}>
          {error}
        </p>
      )}
      {result &&
        (result.length ? (
          <div className={styles.resultGrid}>
            {result.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <p role="status">
            לא נמצאו מתכונים עם המצרכים האלה. אפשר לנסות מצרך נוסף או לפנות לצ׳אט.
          </p>
        ))}
    </section>
  );
}
