import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/permissions';

/**
 * Hook that provides permission checking based on the current user's role.
 * 
 * Usage:
 *   const { can, role } = usePermission();
 *   if (can('products:create')) { ... }
 */
export function usePermission() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'staff';

  const can = (permission) => hasPermission(role, permission);

  return { can, role };
}
