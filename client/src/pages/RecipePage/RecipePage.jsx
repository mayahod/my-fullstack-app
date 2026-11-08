import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './RecipePage.module.css';
import { API_BASE } from '../../services/config';
import { useAuth } from '../../context/AuthContext';
import RecipeDiscussion from './RecipeDiscussion';
import { featuredRecipes } from '../../data/featuredRecipes';
import { difficulties } from '../../data/recipeOptions';
import RecipeSave from '../../components/RecipeSave';
import RecipeImage from '../../components/RecipeImage';
import { FiBarChart2, FiChevronRight, FiClock } from 'react-icons/fi';

const displayText = (value) => value.replace(/[\u05be\u2012-\u2015]/g, '-');

function RecipePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [loadedRecipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const featured = featuredRecipes.find((entry) => entry._id === id);
  const recipe = featured ?? (loadedRecipe?._id === id ? loadedRecipe : null);

  useEffect(() => {
    const controller = new AbortController();
    setRecipe(null);
    setError(null);
    if (featured) return;
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
  }, [id, token, featured]);

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.back}>
        <FiChevronRight aria-hidden="true" /> לכל המתכונים
      </Link>
      {error && !recipe && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!recipe && !error ? (
        <p role="status">טוענים את המתכון…</p>
      ) : recipe ? (
        <article className={styles.recipe}>
          <header className={styles.header}>
            <p className={styles.category}>{recipe.category}</p>
            <h1 className={styles.title}>{recipe.title}</h1>
            <div className={styles.metadata}>
              {recipe.totalMinutes > 0 && (
                <span>
                  <FiClock aria-hidden="true" /> כ-{recipe.totalMinutes} דקות
                </span>
              )}
              {difficulties[recipe.difficulty] && (
                <span>
                  <FiBarChart2 aria-hidden="true" /> {difficulties[recipe.difficulty]}
                </span>
              )}
              {recipe.isPublic && recipe.createdBy && (
                <Link to={`/people/${recipe.createdBy}`}>לפרופיל היוצר</Link>
              )}
            </div>
            {!featured && <RecipeSave key={id + ':' + (token || '')} id={id} />}
          </header>
          {recipe.imageUrl && (
            <RecipeImage src={recipe.imageUrl} alt={recipe.title} className={styles.image} eager />
          )}
          <div className={styles.content}>
            <section className={styles.ingredients}>
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
