import styles from '../pages/HomePage/Home.module.css';
import { Link } from 'react-router-dom';
import { difficulties } from '../data/recipeOptions';

function cardImageUrl(imageUrl) {
  if (!imageUrl) return '';
  try {
    const url = new URL(imageUrl);
    if (!['images.unsplash.com', 'images.pexels.com'].includes(url.hostname)) return imageUrl;
    const width = Number(url.searchParams.get('w'));
    if (!width || width > 640) url.searchParams.set('w', '640');
    if (url.hostname === 'images.unsplash.com') url.searchParams.set('auto', 'format');
    return url.href;
  } catch {
    return imageUrl;
  }
}

function RecipeCard({ recipe, variant, eager = false }) {
  const imageUrl = cardImageUrl(recipe.imageUrl);
  return (
    <article className={variant === 'post' ? styles.postCard : styles.card}>
      <Link to={`/recipes/${recipe._id}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={recipe.title}
            width="480"
            height="320"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={(event) => {
              event.currentTarget.onerror = null;
              if (
                !event.currentTarget.getAttribute('src').endsWith('/images/recipe-placeholder.svg')
              )
                event.currentTarget.src = '/images/recipe-placeholder.svg';
            }}
          />
        ) : (
          <img
            src="/images/recipe-placeholder.svg"
            alt=""
            width="480"
            height="320"
            loading={eager ? 'eager' : 'lazy'}
          />
        )}
        <h3>{recipe.title}</h3>
        <p className={styles.category}>
          {recipe.category || 'מתכון ביתי'}
          {recipe.totalMinutes ? ` · כ-${recipe.totalMinutes} דקות` : ''}
          {difficulties[recipe.difficulty] ? ' · ' + difficulties[recipe.difficulty] : ''}
        </p>
        {recipe.matchedIngredients?.length > 0 && (
          <p className={styles.category}>יש לך: {recipe.matchedIngredients.join(', ')}</p>
        )}
      </Link>
    </article>
  );
}

export default RecipeCard;
