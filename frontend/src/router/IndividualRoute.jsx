import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard for the individual role.
 * Allows access only when the logged-in user has role === 'individual'.
 * Redirects others to their appropriate home.
 */
export default function IndividualRoute() {
  const { user } = useSelector((state) => state.auth);

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'individual') {
    // Shop users go to their normal dashboard
    return <Navigate to={user.shop_id ? '/dashboard' : '/select-shop'} replace />;
  }

  return <Outlet />;
}
