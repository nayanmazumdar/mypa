import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { hasPermission, getFirstAccessibleRoute } from '../utils/permissions';

/**
 * Route guard that checks dynamic RBAC permissions.
 * If denied, redirects to the first route the user CAN access.
 */
export default function PermissionRoute({ permission, children }) {
  const user = useSelector((state) => state.auth.user);

  if (!hasPermission(user, permission)) {
    const target = getFirstAccessibleRoute(user);
    return <Navigate to={target} replace />;
  }

  return children;
}
