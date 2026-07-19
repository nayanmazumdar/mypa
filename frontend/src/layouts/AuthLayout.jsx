import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e8edf5' }}>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
