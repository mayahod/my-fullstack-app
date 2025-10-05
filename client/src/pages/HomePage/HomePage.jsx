import React, { useEffect, useState, useMemo } from 'react';
import styles from './Home.module.css';
import { fetchRecipes } from '../../services/recipes';
import RecipeCard from '../../components/RecipeCard';
import SearchBar from '../../components/common/SearchBar';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecipes()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.recipes ?? []);
        setRecipes(list);
      })
      .catch((err) => {
        console.error('API error:', err);
        setError('Failed to load recipes');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSearchChange = (term) => setSearchTerm(term);

  const filteredRecipes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return recipes.filter((r) => r.title?.toLowerCase().includes(q));
  }, [recipes, searchTerm]);

  const showSuggestions =
    searchTerm.trim().length > 0 && filteredRecipes.length > 0;

  return (
    <div className={styles.home}>
      <h1 className={styles.headline}>כל המתכונים</h1>

      <div className={styles.searchWrapper}>
        <SearchBar onSearchChange={handleSearchChange} />

        {showSuggestions && (
          <ul className={styles.suggestions} role="listbox">
            {filteredRecipes.slice(0, 5).map((recipe) => (
              <li key={recipe._id}>
                <Link
                  to={`/recipes/${recipe._id}`}
                  className={styles.suggestionItem}
                >
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {searchTerm.trim() && filteredRecipes.length === 0 && (
          <div className={styles.suggestions}>
            <div className={styles.noResultsRow}>לא נמצאו תוצאות</div>
          </div>
        )}
      </div>

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

export default HomePage;
