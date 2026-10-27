import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './RecipePage.module.css';
import { API_BASE } from '../../services/config';
import { useAuth } from '../../context/AuthContext';
function RecipePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setRecipe(null);
    setError(null);
    fetch(`${API_BASE}/api/recipes/${id}`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(
            res.status === 404 ? 'המתכון לא נמצא או שהוא פרטי.' : 'לא ניתן לטעון את המתכון כרגע.'
          );
        return res.json();
      })
      .then((data) => {
        setRecipe(data.recipe);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [id, token]);

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

          {recipe.imageUrl && (
            <img src={recipe.imageUrl} alt={recipe.title} className={styles.image} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default RecipePage;
