import React, { useEffect, useState } from 'react';
import styles from './Home.module.css';
import { fetchRecipes } from '../../services/recipes';
import RecipeCard from '../../components/RecipeCard';

const Home = () => {
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    fetchRecipes()
      .then((data) => {
        setRecipes(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('API error:', err);
        setError('Failed to load recipes');
        setIsLoading(false); 
      });
  }, []);

  return (
    <div className={styles.home}>
      <h1 className={styles.headline}>כל המתכונים</h1>
      <SearchBar onSearchChange={handleSearchChange}/>
      {searchTerm && (
        <div className={styles.suggestions}>
          {filteredRecipes.slice(0, 5).map((recipe) => (
            <Link
              key={recipe._id}
              to={`/recipes/${recipe._id}`}   
              className={styles.suggestionItem}
            >
              {recipe.title}
            </Link>
          ))}
        </div>
      )}
      {isLoading ? (
        <p>...טוען מתכונים</p> 
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : recipes.length === 0 ? (
        <p>לא נמצאו מתכונים</p>
      ) : (
        <div className={styles.grid}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
