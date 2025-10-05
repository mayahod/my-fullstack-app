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
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
      />
      <input
        type="text"
        placeholder="...חפש מתכון"
        className={styles.searchInput}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          onSearchChange(e.target.value);
        }}
      />
      <FaTimes className={styles.iconClear} onClick={handleClear} />
    </div>
  );
};

export default SearchBar;
