// import React, { useState } from 'react';
// import styles from './AddRecipe.module.css';
// import { addRecipe } from '../../services/recipes';

// const AddRecipe = () => {
//   const [formData, setFormData] = useState({
//     title: '',
//     ingredients: '',
//     steps: '',
//     category: '',
//     imageUrl: '',
//   });

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const result = await addRecipe(formData);
//       alert('המתכון נוסף בהצלחה!');
//       console.log('Server response:', result);
//     } catch (error) {
//       alert('שגיאה בהוספת המתכון');
//     }
//   };

//   return (
//     <div className={styles.container}>
//       <h1>הוספת מתכון חדש</h1>
//       <form className={styles.form} onSubmit={handleSubmit}>
//         <label>:שם המתכון</label>
//         <input type="text" name="title" value={formData.title} onChange={handleChange} required />

//         <label>:מצרכים</label>
//         <textarea
//           name="ingredients"
//           value={formData.ingredients}
//           onChange={handleChange}
//           required
//         />

//         <label>:אופן ההכנה</label>
//         <textarea name="steps" value={formData.steps} onChange={handleChange} required />

//         <label>:קטגוריה</label>
//         <select name="category" value={formData.category} onChange={handleChange} required>
//           <option value="">בחר קטגוריה</option>
//           <option value="פסטה">פסטה</option>
//           <option value="מרק">מרק</option>
//           <option value="סלט">סלט</option>
//           <option value="לחם">לחם</option>
//           <option value="קינוח">קינוח</option>
//         </select>

//         <label>:קישור לתמונת המתכון</label>
//         <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} />

//         <button type="submit">הוסף מתכון</button>
//       </form>
//     </div>
//   );
// };

// export default AddRecipe;

import styles from './AddRecipe.module.css';
import { addRecipe } from '../../services/recipes';
import React, { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

const AddRecipe = () => {
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
    try {
      await addRecipe(formData);
      setMessage('!המתכון נוסף בהצלחה');
      setMessageType('success');

      setFormData({
        title: '',
        ingredients: '',
        steps: '',
        category: '',
        imageUrl: '',
      });
    } catch (error) {
      console.error('Error adding recipe:', error);
      setMessage('שגיאה בהוספת המתכון');
      setMessageType('error');
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

        <button type="submit">הוסף מתכון</button>
      </form>
    </div>
  );
};

export default AddRecipe;
