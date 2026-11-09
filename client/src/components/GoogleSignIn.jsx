import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../services/config';

let scriptReady;

function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!scriptReady) {
    scriptReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        const identity = window.google?.accounts?.id;
        if (identity) resolve(identity);
        else reject(new Error('Google Identity Services unavailable'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Google Identity Services unavailable'));
      };
      document.head.append(script);
    }).catch((error) => {
      scriptReady = undefined;
      throw error;
    });
  }
  return scriptReady;
}

export default function GoogleSignIn({ clientId, linking = false, onSuccess }) {
  const target = useRef(null);
  const success = useRef(onSuccess);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    success.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const button = target.current;
    let submitting = false;

    async function handleCredential({ credential }) {
      if (signal.aborted || submitting || !credential) return;
      submitting = true;
      setPending(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE}/api/users/google${linking ? '/link' : ''}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
          signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'החיבור ל-Google נכשל. אפשר לנסות שוב.');
        if (!signal.aborted) success.current(data);
      } catch (error) {
        if (!signal.aborted) setError(error.message);
      } finally {
        submitting = false;
        if (!signal.aborted) setPending(false);
      }
    }

    loadGoogle()
      .then((identity) => {
        if (signal.aborted) return;
        identity.initialize({
          client_id: clientId,
          callback: handleCredential,
          ux_mode: 'popup',
        });
        identity.renderButton(button, {
          size: 'large',
          text: linking ? 'continue_with' : 'signin_with',
          locale: 'he',
        });
      })
      .catch(() => {
        if (!signal.aborted) setError('הכפתור של Google לא נטען. אפשר לרענן את העמוד ולנסות שוב.');
      });

    return () => {
      controller.abort();
      button.replaceChildren();
    };
  }, [clientId, linking]);

  return (
    <>
      <div ref={target} />
      {pending && <p role="status">{linking ? 'מקשרים את החשבון…' : 'מתחברים עם Google…'}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
