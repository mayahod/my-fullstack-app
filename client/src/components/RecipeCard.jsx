import styles from '../pages/HomePage/Home.module.css';
import { Link } from 'react-router-dom';

function RecipeCard({ recipe }) {
  return (
    <article className={styles.card}>
      <Link to={`/recipes/${recipe._id}`}>
        {recipe.imageUrl && (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            width="480"
            height="320"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <h3>{recipe.title}</h3>
        <p className={styles.category}>{recipe.category || 'מתכון ביתי'}</p>
      </Link>
    </article>
  );
}

export default RecipeCard;
