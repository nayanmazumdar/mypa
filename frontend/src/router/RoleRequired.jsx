import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Blocks access to any route that requires a role.
 * If the user has no role yet (null), sends them to /choose-role.
 */
export default function RoleRequired() {
  const { user } = useSelector((state) => state.auth);

  if (!user?.role) {
    return <Navigate to="/choose-role" replace />;
  }

  return <Outlet />;
}
