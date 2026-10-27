import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './RecipePage.module.css';
import { API_BASE } from '../../services/config';
import { getCachedRecipe } from '../../services/recipes';
function RecipePage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(() => getCachedRecipe(id));
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setRecipe(getCachedRecipe(id));
    setError(null);
    fetch(`${API_BASE}/api/recipes/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Recipe unavailable');
        return res.json();
      })
      .then((data) => {
        setRecipe(data.recipe);
      })
      .catch((err) => {
        if (err.name !== 'AbortError')
          setError('לא ניתן לטעון את המתכון כרגע. נסו לרענן את העמוד.');
      });
    return () => controller.abort();
  }, [id]);

  return (
    <div className={styles.container}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!recipe && !error ? (
        <p>...טוען מתכון</p>
      ) : recipe ? (
        <div>
          <h1 className={styles.title}>{recipe.title}</h1>

          <h3 className={styles.subtitle}>מצרכים:</h3>
          <ul className={styles.ingredientsList}>
            {recipe.ingredients &&
              recipe.ingredients.map((item, index) => <li key={index}>{item}</li>)}
          </ul>

          <h3 className={styles.subtitle}>אופן ההכנה:</h3>
          <ol className={styles.stepsList}>
            {recipe.steps && recipe.steps.map((step, index) => <li key={index}>{step}</li>)}
          </ol>

          <img src={recipe.imageUrl} alt={recipe.title} className={styles.image} />
        </div>
      ) : null}
    </div>
  );
}

export default RecipePage;
