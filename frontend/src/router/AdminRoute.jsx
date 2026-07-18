import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard that only allows admin role users.
 * Redirects non-admins back to the dashboard or login.
 */
export default function AdminRoute() {
  const { user } = useSelector((state) => state.auth);

  if (user?.role !== 'admin') {
    if (user?.shop_id) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
