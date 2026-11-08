import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import styles from './styles/App.module.css';
import RecipePage from './pages/RecipePage/RecipePage';
import AddRecipe from './pages/AddRecipe/AddRecipe';
import Register from './pages/authentication/Register';
import Login from './pages/authentication/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import ResetPassword from './pages/authentication/ResetPassword';
import Pantry from './pages/Pantry/Pantry';
import Community from './pages/Community/Community';
import Profile from './pages/Community/Profile';
import Demo from './pages/Demo/Demo';
import Library from './pages/Library/Library';
import { FiBookOpen } from 'react-icons/fi';

function AppHeader() {
  const { isAuth, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className={styles.appHeader}>
      <nav className={styles.appNav} aria-label="ניווט ראשי">
        <NavLink to="/" className={styles.brand}>
          <FiBookOpen aria-hidden="true" />
          ספר המתכונים שלנו
        </NavLink>
        <div className={styles.mainLinks}>
          <NavLink to="/search" className={styles.appLink}>
            חיפוש מתכונים
          </NavLink>
          <NavLink to="/community" className={styles.appLink}>
            {isAuth ? 'הפיד שלי' : 'קהילה'}
          </NavLink>
          <NavLink to="/pantry" className={styles.appLink}>
            מה יש במקרר?
          </NavLink>
        </div>
        <div className={styles.accountLinks}>
          {!isAuth ? (
            <>
              <NavLink to="/login" className={styles.appLink}>
                התחברות
              </NavLink>
              <NavLink to="/register" className={styles.appLink}>
                הרשמה
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={styles.appLink}>
                אזור אישי
              </NavLink>
              <button onClick={onLogout} className={styles.appLink}>
                התנתקות
              </button>
            </>
          )}
        </div>
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
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/community" element={<Community />} />
            <Route path="/people/:id" element={<Profile />} />
            <Route path="/recipes/:id" element={<RecipePage />} />
            <Route path="/search" element={<HomePage />} />
            <Route path="/demo" element={<Demo />} />

            {/* עמודים פתוחים */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* עמודים מוגנים */}
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              }
            />
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
