import styles from '../pages/HomePage/Home.module.css';
import { Link } from 'react-router-dom';

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
        {imageUrl && (
          <img
            src={imageUrl}
            alt={recipe.title}
            width="480"
            height="320"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <h3>{recipe.title}</h3>
        <p className={styles.category}>
          {recipe.category || 'מתכון ביתי'}
          {recipe.totalMinutes ? ` · כ-${recipe.totalMinutes} דקות` : ''}
        </p>
      </Link>
    </article>
  );
}

export default RecipeCard;
