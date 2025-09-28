import styles from "../pages/HomePage/Home.module.css";
import { Link } from "react-router-dom";


function RecipeCard (props) {
    return (
        <div className={styles.card}>
            <Link to={`/recipes/${props.recipe._id}`}>
            {props.recipe.imageUrl && (
            <img src={props.recipe.imageUrl} alt={props.recipe.title} />
            )}
            <h3>{props.recipe.title}</h3>
            {/* <p>{props.recipe.description}</p>
            <p>{props.recipe.category}</p> */}
            </Link>
        </div>
    )
}

export default RecipeCard;
