import { useSelector } from 'react-redux';
import { ROLES } from '../utils/constants';

/**
 * Hook to access auth state with role helpers.
 */
export function useAuth() {
  const { user, token, isAuthenticated, loading } = useSelector((state) => state.auth);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    isAdmin: user?.role === ROLES.ADMIN,
    isStaff: user?.role === ROLES.STAFF,
    hasShop: !!user?.shop_id,
    shopId: user?.shop_id,
    shopName: user?.shop_name,
  };
}
