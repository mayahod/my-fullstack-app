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
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setSlow(false);
    const timer = setTimeout(() => { if (active) setSlow(true); }, 8000);
    fetchRecipes()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : (data?.recipes ?? []);
        setRecipes(list);
      })
      .catch((err) => {
        if (active) setError('לא ניתן לטעון את המתכונים כרגע. בדקו את החיבור ונסו שוב.');
      })
      .finally(() => { clearTimeout(timer); if (active) setIsLoading(false); });
    return () => { active = false; clearTimeout(timer); };
  }, [attempt]);

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
      <div className={styles.intro}>
        <p className={styles.eyebrow}>מה מבשלים היום?</p>
        <h1 className={styles.headline}>מתכונים שכיף לחזור אליהם</h1>
        <p>כל הטעמים האהובים במקום אחד. מגלים, מבשלים ומשתפים.</p>
      </div>
      <div className={styles.topBarContainer}>
        <Link to="/add" className={styles.addButton}>
          הוסף מתכון חדש
        </Link>

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
              <option value="newest">החדשים ביותר</option>
              <option value="oldest">הישנים ביותר</option>
            </select>
          </div>
        </div>
      </div>
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
        <div className={styles.status} role="status"><p>טוען מתכונים…</p>{slow && <p>הטעינה מתארכת מעט. עוד רגע המתכונים כאן.</p>}</div>
      ) : error ? (
        <div className={styles.status} role="alert"><p>{error}</p><button onClick={() => setAttempt((value) => value + 1)}>נסו שוב</button></div>
      ) : filteredRecipes.length === 0 ? (
        <p className={styles.status}>לא נמצאו מתכונים בסינון שבחרת</p>
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
