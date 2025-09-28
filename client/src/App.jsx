import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/HomePage/HomePage';
import styles from './styles/App.module.css';
import RecipePage from './pages/RecipePage/RecipePage';


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
            <Route path="/" element={<Home />} />
            <Route path="/recipes/:id" element={<RecipePage />} />
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
