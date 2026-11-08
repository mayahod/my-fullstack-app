import { FaRegComment } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import RecipeCard from './RecipeCard';
import PostLike from './PostLike';
import styles from '../styles/Discovery.module.css';

export default function CommunityPost({ recipe }) {
  return (
    <div className={styles.feedCard}>
      {recipe.author && (
        <Link className={styles.postAuthor} to={`/people/${recipe.author.id}`}>
          <Avatar person={recipe.author} size={34} />
          {recipe.author.firstName}
        </Link>
      )}
      <RecipeCard recipe={recipe} variant="post" />
      <div className={styles.postActions}>
        <PostLike id={recipe._id} liked={recipe.liked} likeCount={recipe.likeCount} />
        <Link className={styles.postAction} to={`/recipes/${recipe._id}#discussion`}>
          <FaRegComment aria-hidden /> תגובות <span>{recipe.commentCount}</span>
        </Link>
      </div>
    </div>
  );
}
