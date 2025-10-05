import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage/HomePage';
import styles from './styles/App.module.css';
import RecipePage from './pages/RecipePage/RecipePage';
import SearchResultsPage from './pages/SearchResultsPage/SearchResultsPage';




function App() {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <header className={styles.appHeader}>
        <Link to="/">
        <img src="/project-logo.png" alt="Logo" className={styles.appLogo} />
        </Link>
          <nav className={styles.appNav}>
            <Link to="/" className={styles.appLink}>Home</Link>
          </nav>
        </header>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipes/:id" element={<RecipePage />} />
            <Route path="/search" element={<SearchResultsPage />} />
          </Routes>
        </main>
        {/* <footer className={styles.footer}>
          <p>&copy; 2024 My App</p>
        </footer> */}
      </div>
    </BrowserRouter>
  );
}

export default App;
