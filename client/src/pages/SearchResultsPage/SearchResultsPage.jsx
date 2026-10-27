import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './SearchResultsPage.module.css';
import RecipeCard from '../../components/RecipeCard';
import { fetchRecipes } from '../../services/recipes';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('query') || '').trim();
  const [all, setAll] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    fetchRecipes()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.recipes ?? []);
        setAll(list);
      })
      .catch((e) => {
        console.error('Failed to load recipes for search page:', e);
        setError('שגיאה בטעינת תוצאות');
      })
      .finally(() => setIsLoading(false));
  }, [query]);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return all.filter((r) => r.title?.toLowerCase().includes(q));
  }, [all, query]);

  return (
    <div className={styles.resultsPage}>
      <h1 className={styles.title}>תוצאות עבור: {query || '—'}</h1>

      {isLoading ? (
        <p>טוען תוצאות…</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : results.length === 0 ? (
        <p className={styles.noResults}>לא נמצאו מתכונים מתאימים</p>
      ) : (
        <div className={styles.grid}>
          {results.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
