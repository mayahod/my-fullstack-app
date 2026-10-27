import { useEffect } from 'react';
import styles from './SuccessOverlay.module.css';

export default function SuccessOverlay({ title, subtitle, autoCloseMs = 1200, onClose, goNext }) {
  useEffect(() => {
    if (!autoCloseMs) return;
    const t = setTimeout(() => {
      onClose?.();
      goNext?.();
    }, autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs, onClose, goNext]);

  const handleClose = () => {
    onClose?.();
    goNext?.();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <div className={styles.contentBox}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

          <div className={styles.circleWrap}>
            <button
              type="button"
              className={styles.closeInCircle}
              aria-label="סגירה"
              onClick={handleClose}
            >
              ×
            </button>

            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.checkSvg}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M7 12l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
