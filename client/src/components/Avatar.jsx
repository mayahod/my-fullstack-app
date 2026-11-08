import { API_BASE } from '../services/config';
import styles from '../styles/Discovery.module.css';

export default function Avatar({ person, preview, size = 40 }) {
  const url =
    preview ??
    (person?.avatarVersion &&
      `${API_BASE}/api/community/people/${person.id}/avatar?v=${person.avatarVersion}`);
  return (
    <span aria-hidden="true" className={styles.avatar} style={{ width: size, height: size }}>
      {Array.from(person?.firstName?.trim() || '?')[0]}
      {url && (
        <img
          key={url}
          src={url}
          alt=""
          width={size}
          height={size}
          loading={preview ? 'eager' : 'lazy'}
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
