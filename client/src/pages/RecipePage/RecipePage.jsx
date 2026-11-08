import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './RecipePage.module.css';
import { API_BASE } from '../../services/config';
import { useAuth } from '../../context/AuthContext';
import RecipeDiscussion from './RecipeDiscussion';

const displayText = (value) => value.replace(/[\u05be\u2012-\u2015]/g, '-');

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
        <p role="status">טוענים את המתכון…</p>
      ) : recipe ? (
        <article className={styles.recipe}>
          <header className={styles.header}>
            <p className={styles.category}>{recipe.category}</p>
            <h1 className={styles.title}>{recipe.title}</h1>
            {recipe.totalMinutes && <p>זמן כולל משוער: כ-{recipe.totalMinutes} דקות</p>}
            {recipe.isPublic && recipe.createdBy && (
              <Link to={`/people/${recipe.createdBy}`}>לפרופיל היוצר</Link>
            )}
          </header>
          {recipe.imageUrl && (
            <img src={recipe.imageUrl} alt={recipe.title} className={styles.image} />
          )}
          <div className={styles.content}>
            <section>
              <h2 className={styles.subtitle}>מצרכים</h2>
              <ul className={styles.ingredientsList}>
                {recipe.ingredients &&
                  recipe.ingredients.map((item, index) => <li key={index}>{displayText(item)}</li>)}
              </ul>
            </section>
            <section>
              <h2 className={styles.subtitle}>אופן ההכנה</h2>
              <ol className={styles.stepsList}>
                {recipe.steps &&
                  recipe.steps.map((step, index) => <li key={index}>{displayText(step)}</li>)}
              </ol>
            </section>
          </div>
          {recipe.isPublic && <RecipeDiscussion key={`${id}:${token ?? ''}`} id={id} />}
        </article>
      ) : null}
    </div>
  );
}

export default RecipePage;
