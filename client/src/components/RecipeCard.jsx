import styles from './RecipeCard.module.css';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiClock } from 'react-icons/fi';
import { difficulties } from '../data/recipeOptions';
import RecipeImage from './RecipeImage';

function RecipeCard({ recipe, variant, eager = false }) {
  return (
    <article className={variant === 'post' ? styles.postCard : styles.card}>
      <Link to={`/recipes/${recipe._id}`}>
        <RecipeImage src={recipe.imageUrl} thumbnail eager={eager} />
        <div className={styles.body}>
          <p className={styles.category}>{recipe.category || 'מתכון ביתי'}</p>
          <h3>{recipe.title}</h3>
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
          </div>
          {recipe.matchedIngredients?.length > 0 && (
            <p className={styles.matches}>יש לך {recipe.matchedIngredients.join(', ')}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

export default RecipeCard;
