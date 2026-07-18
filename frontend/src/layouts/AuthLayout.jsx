import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (isAuthenticated && user?.shop_id) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin/shops" replace />;
  }

  if (isAuthenticated && user?.role === 'individual') {
    return <Navigate to="/individual" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e8edf5' }}>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
