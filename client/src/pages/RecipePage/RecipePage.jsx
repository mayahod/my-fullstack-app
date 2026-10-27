import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "./RecipePage.module.css";  
import { API_BASE } from '../../services/config';
function RecipePage () {
    const { id } = useParams();
    const [recipe, setRecipe] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/recipes/${id}`)
            .then((res) => res.json())
            .then((data) => {
                setRecipe(data.recipe); 
            })
            .catch((err) => {
                setError("couldn't load recipe");
                console.error(err);
            });
    }, [id]);

    return (
        <div className={styles.container}>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {!recipe ? (
                <p>...טוען מתכון</p>
            ) : (
                <div>
                    <h1 className={styles.title}>{recipe.title}</h1>

                    <h3 className={styles.subtitle}>:מצרכים</h3>
                    <ul className={styles.ingredientsList}>
                        {recipe.ingredients && recipe.ingredients.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>

                    <h3 className={styles.subtitle}>:אופן ההכנה</h3>
                    <ol className={styles.stepsList}>
                        {recipe.steps && recipe.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                        ))}
                    </ol>

                    <img 
                        src={recipe.imageUrl} 
                        alt={recipe.title} 
                        className={styles.image}
                    />
                </div>
            )}
        </div>
    );
}

export default RecipePage;
