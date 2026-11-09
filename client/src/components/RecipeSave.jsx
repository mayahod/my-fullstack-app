import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changeSavedRecipe, libraryRequest } from '../services/library';
import styles from '../styles/Discovery.module.css';

export default function RecipeSave({ id }) {
  const { user } = useAuth();
  const viewerId = user?.id;
  const location = useLocation();
  const [collections, setCollections] = useState(null);
  const [collectionId, setCollectionId] = useState('favorites');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const selected = collections?.find((list) => list.id === collectionId);
  const saved = selected?.recipes.some((recipe) => recipe._id === id);

  useEffect(() => {
    if (!viewerId) return;
    const controller = new AbortController();
    libraryRequest('', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCollections(data.collections);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [viewerId, attempt]);

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      await changeSavedRecipe(collectionId, id, !saved);
      setCollections((current) =>
        current.map((list) =>
          list.id !== collectionId
            ? list
            : {
                ...list,
                recipes: saved
                  ? list.recipes.filter((recipe) => recipe._id !== id)
                  : [...list.recipes, { _id: id }],
              }
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!viewerId)
    return (
      <Link className={styles.textLink} to="/login" state={{ from: location }}>
        התחברות לשמירת המתכון
      </Link>
    );
  return (
    <div className={styles.recipeSave}>
      {collections ? (
        <div className={styles.actions}>
          <label>
            שמירה באוסף{' '}
            <select
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
              disabled={busy}
            >
              {collections.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-pressed={Boolean(saved)}
            aria-busy={busy}
          >
            {saved ? 'הסרה מהאוסף' : 'שמירת מתכון'}
          </button>
        </div>
      ) : error ? (
        <button
          type="button"
          onClick={() => {
            setError('');
            setAttempt((value) => value + 1);
          }}
        >
          טעינת אוספים מחדש
        </button>
      ) : (
        <small role="status">טוענים אוספים…</small>
      )}
      {error && (
        <p role="alert" className={styles.chatError}>
          {error}
        </p>
      )}
    </div>
  );
}
