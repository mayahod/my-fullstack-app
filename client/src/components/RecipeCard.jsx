import styles from "../pages/HomePage/Home.module.css";
import { Link } from "react-router-dom";


function RecipeCard (props) {
    return (
        <article className={styles.card}>
            <Link to={`/recipes/${props.recipe._id}`}>
            {props.recipe.imageUrl && (
            <img src={props.recipe.imageUrl} alt={props.recipe.title} width="480" height="320" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            )}
            <h3>{props.recipe.title}</h3>
            <p className={styles.category}>{props.recipe.category || 'מתכון ביתי'}</p>
            {/* <p>{props.recipe.description}</p>
            <p>{props.recipe.category}</p> */}
            </Link>
        </article>
    )
}

export default RecipeCard;
