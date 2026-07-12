import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

/**
 * Route guard that checks if the current user has the required permission.
 * If not, redirects to dashboard.
 */
export default function PermissionRoute({ permission, children }) {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role || 'staff';

  if (!hasPermission(role, permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
