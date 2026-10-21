import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    if (location.pathname === '/desktop/connect') {
      sessionStorage.setItem('arc-desktop-connect', location.search);
    }
    if (location.pathname === '/connect-machine') {
      sessionStorage.setItem('arc-machine-connect', location.search);
    }
    return <Navigate to="/login" replace state={{ from: next }} />;
  }

  return <Outlet />;
}
