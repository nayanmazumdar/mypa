import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route guard — redirects to shop selector if no shop is active.
 * The selector page handles both "pick from list" and "create first shop".
 */
export default function ShopRequired() {
  const { user } = useSelector((state) => state.auth);

  if (!user?.shop_id) {
    return <Navigate to="/select-shop" replace />;
  }

  return <Outlet />;
}
