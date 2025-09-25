import React, { useEffect, useState } from 'react';
import styles from './Home.module.css';
import { fetchRecipes } from '../../services/recipes';

const Home = () => {
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch((err) => {
        console.error('API error:', err);
        setError('Failed to load recipes');
      });
  }, []);

  return (
    <div className={styles.home}>
      <h1 className={styles.headline}>📋 All Recipes</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {recipes.length === 0 ? (
        <p>No recipes found.</p>
      ) : (
        <ul>
          {recipes.map((recipe) => (
            <li key={recipe._id}>{recipe.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Home;
