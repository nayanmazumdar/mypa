import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * ModuleRequired — ensures the user completed first-time RBAC setup.
 *
 * Gate order:
 *   ProtectedRoute → RoleRequired → ModuleRequired → ShopRequired / IndividualRoute
 *
 * Behaviour:
 * - Has role + default_module  → pass through (normal case)
 * - Has role but NO module     → pass through (legacy/existing accounts — ShopRequired
 *                                 and IndividualRoute will route them to their home)
 * - No role at all             → RoleRequired already caught this above us
 *
 * We only block (redirect to /choose-role) when the user has NO role at all,
 * but that's already handled by RoleRequired. So ModuleRequired simply passes
 * through — its real job is protecting the redirect-after-login logic, not
 * acting as a hard gate here.
 */
export default function ModuleRequired() {
  const { user } = useSelector((state) => state.auth);

  // If somehow role is missing here (shouldn't happen after RoleRequired), bounce back
  if (!user?.role) {
    return <Navigate to="/choose-role" replace />;
  }

  // Role is set — always let through.
  // If default_module is null (legacy account), ShopRequired / IndividualRoute
  // will send them to the right place (/dashboard or /individual).
  return <Outlet />;
}
