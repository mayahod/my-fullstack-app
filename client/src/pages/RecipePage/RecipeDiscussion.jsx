import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import PostLike from '../../components/PostLike';
import { useAuth } from '../../context/AuthContext';
import { communityRequest } from '../../services/community';
import styles from '../../styles/Discovery.module.css';

const dateFormat = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' });

export default function RecipeDiscussion({ id }) {
  const { user } = useAuth();
  const viewerId = user?.id;
  const location = useLocation();
  const section = useRef(null);
  const pendingId = useRef(null);
  const [discussion, setDiscussion] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const path = `/posts/${id}`;

  useEffect(() => {
    const controller = new AbortController();
    communityRequest(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setDiscussion(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [path, viewerId, attempt]);

  useEffect(() => {
    if (location.hash === '#discussion') section.current?.scrollIntoView({ block: 'start' });
  }, [location.hash, id]);

  async function addComment(event) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy('send');
    setError('');
    try {
      pendingId.current ??= crypto.randomUUID();
      const { comment } = await communityRequest(`${path}/comments`, {
        method: 'POST',
        body: { id: pendingId.current, text: draft },
      });
      setDiscussion((current) => ({
        ...current,
        comments: current.comments.some((item) => item.id === comment.id)
          ? current.comments
          : [...current.comments, comment],
      }));
      pendingId.current = null;
      setDraft('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function removeComment(commentId) {
    setBusy(commentId);
    setError('');
    try {
      await communityRequest(`${path}/comments/${commentId}`, { method: 'DELETE' });
      setDiscussion((current) => ({
        ...current,
        comments: current.comments.filter((item) => item.id !== commentId),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <section
      id="discussion"
      ref={section}
      className={styles.discussion}
      aria-labelledby="discussion-title"
    >
      <div className={styles.discussionHeader}>
        <h2 id="discussion-title">
          תגובות {discussion && <span>{discussion.comments.length}</span>}
        </h2>
        {discussion && (
          <PostLike id={id} liked={discussion.liked} likeCount={discussion.likeCount} />
        )}
      </div>
      {error && (
        <p role="alert" className={styles.chatError}>
          {error}
        </p>
      )}
      {!discussion ? (
        error ? (
          <button
            type="button"
            onClick={() => {
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            נסו שוב
          </button>
        ) : (
          <p role="status">טוענים את הדיון…</p>
        )
      ) : (
        <>
          {viewerId ? (
            <form className={styles.commentForm} onSubmit={addComment}>
              <label htmlFor="comment-text">הוספת תגובה</label>
              <textarea
                id="comment-text"
                placeholder="מה חשבתם על המתכון?"
                maxLength={600}
                rows={3}
                value={draft}
                disabled={busy === 'send'}
                onChange={(event) => {
                  setDraft(event.target.value);
                  pendingId.current = null;
                }}
              />
              <button
                type="submit"
                disabled={Boolean(busy) || !draft.trim()}
                aria-busy={busy === 'send'}
              >
                {busy === 'send' ? 'שולחים…' : 'פרסום תגובה'}
              </button>
            </form>
          ) : (
            <Link className={styles.textLink} to="/login" state={{ from: location }}>
              התחברו כדי להוסיף תגובה
            </Link>
          )}
          {discussion.comments.length ? (
            <ul className={styles.comments}>
              {discussion.comments.map((comment) => (
                <li className={styles.comment} key={comment.id}>
                  <Avatar person={comment.author} size={36} />
                  <div>
                    <div className={styles.commentMeta}>
                      <strong>{comment.author?.firstName ?? 'חבר בקהילה'}</strong>
                      <time dateTime={comment.createdAt}>
                        {dateFormat.format(new Date(comment.createdAt))}
                      </time>
                    </div>
                    <p dir="auto">{comment.text}</p>
                    {viewerId && comment.canDelete && (
                      <button
                        className={styles.deleteComment}
                        type="button"
                        disabled={Boolean(busy)}
                        aria-busy={busy === comment.id}
                        onClick={() => removeComment(comment.id)}
                      >
                        {busy === comment.id ? 'מוחקים…' : 'מחיקת תגובה'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>עדיין אין תגובות. אפשר לפתוח את השיחה.</p>
          )}
        </>
      )}
    </section>
  );
}
