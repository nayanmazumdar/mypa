import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard — redirects to shop selector if no shop is selected.
 */
export default function ShopRequired() {
  const { user } = useSelector((state) => state.auth);

  if (!user?.shop_id) {
    // No shop selected — check if user has any shops
    if (user?.shops?.length > 0) {
      return <Navigate to="/select-shop" replace />;
    }
    // No shops at all — create one
    return <Navigate to="/create-shop" replace />;
  }

  return <Outlet />;
}
