import styles from '../../pages/HomePage/Home.module.css';
import { FaSearch, FaTimes } from 'react-icons/fa';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = ({ onSearchChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleClear = () => {
    setSearchTerm('');
    onSearchChange('');
  };

  const handleSearchClick = () => {
    const q = searchTerm.trim();
    if (!q) return;
    navigate(`/search?query=${encodeURIComponent(q)}`);
  };

  return (
    <div className={styles.searchContainer}>
      <FaSearch
        className={styles.iconSearch}
        onClick={handleSearchClick}
        role="button"
        aria-label="חיפוש מתכון"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
      />

      <input
        type="text"
        placeholder="  חפש מתכון..."
        className={styles.searchInput}
        value={searchTerm}
        onKeyDown={(event) => { if (event.key === 'Enter') handleSearchClick(); }}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          onSearchChange(e.target.value);
        }}
      />

      {searchTerm && <FaTimes className={styles.iconClear} onClick={handleClear} role="button" aria-label="ניקוי החיפוש" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleClear(); }} />}
    </div>
  );
};

export default SearchBar;
