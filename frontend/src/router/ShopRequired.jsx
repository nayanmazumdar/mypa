import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard — redirects to shop selector if no shop is active.
 * Individual users are redirected to their own dashboard.
 */
export default function ShopRequired() {
  const { user } = useSelector((state) => state.auth);

  // Individual role users have no shop — send them home
  if (user?.role === 'individual') {
    return <Navigate to="/individual" replace />;
  }

  if (!user?.shop_id) {
    return <Navigate to="/admin/shops" replace />;
  }

  return <Outlet />;
}
