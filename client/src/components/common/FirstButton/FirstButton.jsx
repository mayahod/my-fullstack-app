import styles from './FirstButton.module.css';

const FirstButton = ({ children, onClick, disabled }) => {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default FirstButton;