import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard — requires an active shop_id.
 * - Individual users → /individual
 * - Admin without shop → /admin/shops
 * - Non-admin without shop → /select-shop (handles empty shops gracefully)
 */
export default function ShopRequired() {
  const { user } = useSelector((state) => state.auth);

  if (user?.role === 'individual') {
    return <Navigate to="/individual" replace />;
  }

  if (!user?.shop_id) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin/shops" replace />;
    }
    // Non-admin — always go to select-shop (it shows "No Shop Assigned" if empty)
    return <Navigate to="/select-shop" replace />;
  }

  return <Outlet />;
}
