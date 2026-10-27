import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuth, checking, authError, retryAuth } = useAuth();
  const location = useLocation();

  if (checking) return <p role="status">בודקים את ההתחברות…</p>;
  if (authError)
    return (
      <div role="alert">
        <p>{authError}</p>
        <button onClick={retryAuth}>נסו שוב</button>
      </div>
    );

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
