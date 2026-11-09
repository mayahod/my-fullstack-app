import { useState } from 'react';
import Avatar from '../../components/Avatar';
import { communityRequest } from '../../services/community';
import styles from '../../styles/Discovery.module.css';

async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 ** 2)
    throw new Error('בחרו קובץ JPG, PNG או WebP בגודל של עד 8 מגה.');

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const crop = Math.min(bitmap.width, bitmap.height);
    canvas.width = canvas.height = Math.min(crop, 128);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      bitmap,
      (bitmap.width - crop) / 2,
      (bitmap.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return canvas.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}

export default function ProfilePhoto({ person, onSaved }) {
  const [preview, setPreview] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = preparing || saving;

  async function choose(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setPreparing(true);
    setError('');
    setNotice('');
    setPreview('');
    try {
      setPreview(await preparePhoto(file));
    } catch (err) {
      setError(err.message || 'לא הצלחנו לפתוח את התמונה');
    } finally {
      setPreparing(false);
    }
  }

  async function save(remove) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { person: updated } = await communityRequest('/profile/avatar', {
        method: remove ? 'DELETE' : 'PUT',
        body: remove ? undefined : { avatar: preview },
      });
      onSaved(updated.avatarVersion);
      setPreview('');
      setNotice(remove ? 'תמונת הפרופיל הוסרה' : 'תמונת הפרופיל נשמרה');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="photo-heading">
      <h2 id="photo-heading">תמונת פרופיל</h2>
      <p className={styles.muted}>לבחירה. התמונה שתבחרו תופיע בפרופיל הציבורי ובקהילה.</p>
      <div className={styles.photoEditor}>
        <Avatar person={person} preview={preview || undefined} size={68} />
        <div className={styles.photoInput}>
          <label htmlFor="profile-photo">בחירת תמונה</label>
          <input
            id="profile-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={choose}
          />
        </div>
      </div>
      <div className={styles.actions}>
        {preview && (
          <>
            <button type="button" disabled={busy} aria-busy={saving} onClick={() => save(false)}>
              {saving ? 'שומרים…' : 'שמירת תמונה'}
            </button>
            <button
              className={styles.secondary}
              type="button"
              disabled={busy}
              onClick={() => setPreview('')}
            >
              ביטול
            </button>
          </>
        )}
        {!preview && person.avatarVersion && (
          <button
            className={styles.secondary}
            type="button"
            disabled={busy}
            aria-busy={saving}
            onClick={() => save(true)}
          >
            {saving ? 'מסירים…' : 'הסרת תמונה'}
          </button>
        )}
      </div>
      {preparing && <p role="status">מכינים את התמונה…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className={styles.chatError}>
          {error}
        </p>
      )}
    </section>
  );
}
