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
  const [sortOption, setSortOption] = useState('default');
  const [filterOption, setFilterOption] = useState('all');

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
    let list = recipes;

    if (filterOption !== 'all') {
      list = list.filter((r) => r.category?.trim() === filterOption.trim());
    }

    if (sortOption === 'name') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'he'));
    } else if (sortOption === 'nameDesc') {
      list = [...list].sort((a, b) => b.title.localeCompare(a.title, 'he'));
    } else if (sortOption === 'newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortOption === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return list;
  }, [recipes, sortOption, filterOption]);

  const searchSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return recipes.filter((r) => r.title?.toLowerCase().includes(q));
  }, [recipes, searchTerm]);

  const showSuggestions = searchTerm.trim().length > 0 && filteredRecipes.length > 0;

  return (
    <div className={styles.home}>
      <div className={styles.topBar}>
        <div className={styles.filterButton}>
          <label htmlFor="filter" className={styles.filterLabel}>
            :סינון לפי
          </label>
          <select
            id="filter"
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">הכול</option>
            <option value="פסטה">פסטה</option>
            <option value="מרק">מרק</option>
            <option value="סלט">סלט</option>
            <option value="לחם">לחם</option>
            <option value="קינוח">קינוח</option>
          </select>
        </div>

        <div className={styles.sortButton}>
          <label htmlFor="sort" className={styles.sortLabel}>
            :מיון לפי
          </label>
          <select
            id="sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="default">ללא</option>
            <option value="name">שם (א-ת)</option>
            <option value="nameDesc">שם (ת-א)</option>
            <option value="newest">הכי חדשים</option>
            <option value="oldest">הכי ישנים</option>
          </select>
        </div>
      </div>
      <h1 className={styles.headline}>כל המתכונים</h1>
      <div className={styles.searchWrapper}>
        <SearchBar onSearchChange={handleSearchChange} />

        {searchSuggestions.length > 0 && (
          <ul className={styles.suggestions} role="listbox">
            {searchSuggestions.slice(0, 5).map((recipe) => (
              <li key={recipe._id}>
                <Link to={`/recipes/${recipe._id}`} className={styles.suggestionItem}>
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {searchTerm.trim() && searchSuggestions.length === 0 && (
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
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
