import { useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { communityRequest } from '../services/community';
import styles from '../styles/Discovery.module.css';

export default function PostLike({ id, liked, likeCount }) {
  const { token } = useAuth();
  const location = useLocation();
  const [reaction, setReaction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = reaction ?? { liked, likeCount };

  async function update() {
    setBusy(true);
    setError('');
    try {
      setReaction(
        await communityRequest(`/posts/${id}/like`, {
          method: current.liked ? 'DELETE' : 'PUT',
          token,
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {token ? (
        <button
          type="button"
          className={styles.postAction}
          aria-pressed={current.liked}
          aria-busy={busy}
          disabled={busy}
          onClick={update}
        >
          {current.liked ? <FaHeart aria-hidden /> : <FaRegHeart aria-hidden />}
          לייקים <span>{current.likeCount}</span>
        </button>
      ) : (
        <Link className={styles.postAction} to="/login" state={{ from: location }}>
          <FaRegHeart aria-hidden /> לייקים <span>{current.likeCount}</span>
          <span className={styles.srOnly}>התחברו כדי לסמן לייק</span>
        </Link>
      )}
      {error && (
        <small className={styles.postError} role="alert">
          {error}
        </small>
      )}
    </>
  );
}
