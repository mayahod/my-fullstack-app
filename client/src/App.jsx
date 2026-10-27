// import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
// import HomePage from './pages/HomePage/HomePage';
// import styles from './styles/App.module.css';
// import RecipePage from './pages/RecipePage/RecipePage';
// import SearchResultsPage from './pages/SearchResultsPage/SearchResultsPage';
// import AddRecipe from './pages/AddRecipe/AddRecipe';
// import Register from './pages/authentication/Register';
// import Login from './pages/authentication/Login';
// import Dashboard from './pages/Dashboard/Dashboard';
// import ProtectedRoute from './components/routing/ProtectedRoute';
// import { useAuth } from './context/AuthContext';

// function App() {
//   return (
//     <BrowserRouter>
//       <div className={styles.app}>
//         <header className={styles.appHeader}>
//           <Link to="/">
//             <img src="/project-logo.png" alt="Logo" className={styles.appLogo} />
//           </Link>
//           <nav className={styles.appNav}>
//             <Link to="/login" className={styles.appLink}>
//               התחברות
//             </Link>
//             <Link to="/register" className={styles.appLink}>
//               הרשמה
//             </Link>
//             <Link to="/" className={styles.appLink}>
//               בית
//             </Link>
//           </nav>
//         </header>
//         <main className={styles.main}>
//           <Routes>
//             <Route path="/" element={<HomePage />} />
//             <Route path="/recipes/:id" element={<RecipePage />} />
//             <Route path="/search" element={<SearchResultsPage />} />
//             <Route path="/add" element={<AddRecipe />} />
//             <Route path="/register" element={<Register />} />
//             <Route path="/login" element={<Login />} />
//           </Routes>
//         </main>
//         {}
//       </div>
//     </BrowserRouter>
//   );
// }

// export default App;

// client/src/App.jsx
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import styles from './styles/App.module.css';
import RecipePage from './pages/RecipePage/RecipePage';
import SearchResultsPage from './pages/SearchResultsPage/SearchResultsPage';
import AddRecipe from './pages/AddRecipe/AddRecipe';
import Register from './pages/authentication/Register';
import Login from './pages/authentication/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import ResetPassword from './pages/authentication/ResetPassword';

function AppHeader() {
  const { isAuth, logout, user } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className={styles.appHeader}>
      <Link to="/" className={styles.brand}>ספר המתכונים שלנו</Link>
      <nav className={styles.appNav}>
        <Link to="/" className={styles.appLink}>
          בית
        </Link>

        {!isAuth && (
          <>
            <Link to="/login" className={styles.appLink}>
              התחברות
            </Link>
            <Link to="/register" className={styles.appLink}>
              הרשמה
            </Link>
          </>
        )}

        {isAuth && (
          <>
            <Link to="/dashboard" className={styles.appLink}>
              אזור אישי
            </Link>
            <button
              onClick={onLogout}
              className={styles.appLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              התנתקות{user?.firstName ? ` (${user.firstName})` : ''}
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <AppHeader />

        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipes/:id" element={<RecipePage />} />
            <Route path="/search" element={<SearchResultsPage />} />

            {/* עמודים פתוחים */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* עמודים מוגנים */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add"
              element={
                <ProtectedRoute>
                  <AddRecipe />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
