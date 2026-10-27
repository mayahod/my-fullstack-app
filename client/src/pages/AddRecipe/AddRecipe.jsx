import styles from './AddRecipe.module.css';
import { addRecipe } from '../../services/recipes';
import { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AddRecipe = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    ingredients: '',
    steps: '',
    category: '',
    imageUrl: '',
  });

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await addRecipe(formData, token);
      navigate('/dashboard', { state: { notice: 'המתכון נוסף בהצלחה' } });
    } catch (error) {
      console.error('Error adding recipe:', error);
      setMessage('שגיאה בהוספת המתכון');
      setMessageType('error');
    } finally {
      setSaving(false);
    }

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className={styles.container}>
      {message && (
        <div className={`${styles.fullScreenMessage} ${styles[messageType]}`}>
          <button
            className={styles.closeButton}
            onClick={() => setMessage(null)}
            aria-label="סגור הודעה"
          >
            <FaTimes />
          </button>
          {messageType === 'success' ? (
            <>
              <FaCheckCircle className={styles.icon} />
              <p>{message}</p>
            </>
          ) : (
            <>
              <FaTimesCircle className={styles.icon} />
              <p>{message}</p>
            </>
          )}
        </div>
      )}
      <h1>הוספת מתכון חדש</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>:שם המתכון</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} required />

        <label>:מצרכים</label>
        <textarea
          name="ingredients"
          value={formData.ingredients}
          onChange={handleChange}
          required
        />
        <small className={styles.hint}>.Enter בעת הוספת מצרכים, יש להקיש בין כל מצרך</small>

        <label>:אופן ההכנה</label>
        <textarea name="steps" value={formData.steps} onChange={handleChange} required />
        <small className={styles.hint}>.Enter בעת הוספת שלבי ההכנה, יש להקיש בין כל שלב</small>

        <label>:קטגוריה</label>
        <select name="category" value={formData.category} onChange={handleChange} required>
          <option value="">בחר קטגוריה</option>
          <option value="פסטה">פסטה</option>
          <option value="מרק">מרק</option>
          <option value="סלט">סלט</option>
          <option value="לחם">לחם</option>
          <option value="קינוח">קינוח</option>
        </select>

        <label>:קישור לתמונת המתכון</label>
        <input
          type="text"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? 'שומרים…' : 'הוסף מתכון'}
        </button>
      </form>
    </div>
  );
};

export default AddRecipe;
