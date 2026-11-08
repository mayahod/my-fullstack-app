import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../../services/config';
import styles from '../../styles/Discovery.module.css';
import CookingAnswer from './CookingAnswer';
import IngredientMatches from './IngredientMatches';

const sample = [
  { role: 'user', text: 'יש לי ביצים, עגבניות ובצל. מה אפשר להכין?' },
  {
    role: 'assistant',
    text: 'שקשוקה מהירה · כ-20 דקות\n\nקוצצים את הבצל והעגבניות ומבשלים במחבת עם מעט שמן עד שהעגבניות מתרככות. יוצרים גומות, שוברים לתוכן את הביצים, מכסים ומבשלים עד שהן עשויות.\n\nאם יש בבית מלח, פלפל או פפריקה, אפשר להוסיף לפי הטעם.',
  },
];

export default function Pantry() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(null);
  const [showExample, setShowExample] = useState(false);
  const chatInput = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API_BASE + '/api/pantry/status', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (typeof data?.available === 'boolean') setAvailable(data.available);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || available === false) return;
    const conversation = [...messages.slice(-8), { role: 'user', text }];
    setShowExample(false);
    setPending(text);
    setDraft('');
    setError('');
    try {
      const response = await fetch(API_BASE + '/api/pantry/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.answer !== 'string') {
        throw new Error(data?.message || 'לא ניתן לקבל תשובה כרגע. נסו שוב.');
      }
      setAvailable(true);
      setMessages((previous) => [
        ...previous,
        { role: 'user', text },
        { role: 'assistant', text: data.answer },
      ]);
    } catch (err) {
      setError(err.message);
      setDraft(text);
    } finally {
      setPending('');
    }
  };

  const shown = showExample ? sample : messages;
  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>עוזר בישול עם AI</p>
        <h1>מה יש במקרר?</h1>
        <p>ספרו מה יש בבית וקבלו רעיון למנה, זמן הכנה משוער ושלבים קצרים. אפשר גם לבקש תחליף.</p>
      </header>
      <IngredientMatches
        askAssistant={(ingredients) => {
          setDraft('יש לי ' + ingredients + '. מה אפשר להכין?');
          chatInput.current?.scrollIntoView({ block: 'center' });
          chatInput.current?.focus({ preventScroll: true });
        }}
      />
      <div className={styles.panel}>
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            type="button"
            disabled={Boolean(pending)}
            onClick={() => {
              setShowExample(true);
              setError('');
            }}
          >
            הצגת שיחת דוגמה
          </button>
          {(messages.length > 0 || showExample) && (
            <button
              className={styles.secondary}
              type="button"
              disabled={Boolean(pending)}
              onClick={() => {
                setShowExample(false);
                setMessages([]);
                setDraft('');
                setError('');
              }}
            >
              שיחה חדשה
            </button>
          )}
        </div>
        {available === false && (
          <p role="status">הצ׳אט החי עדיין לא זמין. אפשר לראות איך הוא ייראה בשיחת הדוגמה.</p>
        )}
        {showExample && <p className={styles.kicker}>שיחת דוגמה מוכנה מראש</p>}
        <div className={styles.chatLog} role="log" aria-label="השיחה עם עוזר הבישול">
          {shown.map((message, index) => (
            <article
              className={message.role === 'user' ? styles.chatUser : styles.chatAssistant}
              key={index}
            >
              <strong>{message.role === 'user' ? 'אתם' : 'עוזר הבישול'}</strong>
              {message.role === 'assistant' ? (
                <CookingAnswer text={message.text} />
              ) : (
                <p>{message.text}</p>
              )}
            </article>
          ))}
          {pending && (
            <>
              <article className={styles.chatUser}>
                <strong>אתם</strong>
                <p>{pending}</p>
              </article>
              <p role="status">עוזר הבישול חושב על רעיון…</p>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className={styles.chatError}>
            {error}
          </p>
        )}
        <form className={styles.chatForm} onSubmit={send}>
          <label htmlFor="pantry-message">מה יש לך במקרר?</label>
          <textarea
            id="pantry-message"
            ref={chatInput}
            rows={3}
            maxLength={600}
            value={draft}
            disabled={Boolean(pending) || available === false}
            placeholder="למשל יש לי חומוס, עגבניות ואורז, ואני רוצה להכין משהו בחצי שעה"
            onChange={(event) => setDraft(event.target.value)}
          />
          <small>הטקסט נשלח ל-Gemini כדי להציע מנה. השיחה לא מתפרסמת בקהילה.</small>
          <button type="submit" disabled={!draft.trim() || Boolean(pending) || available === false}>
            {pending ? 'שולחים…' : 'שליחה לעוזר הבישול'}
          </button>
        </form>
      </div>
    </section>
  );
}
