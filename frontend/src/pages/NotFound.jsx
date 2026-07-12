import { useNavigate } from 'react-router-dom';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e8edf5' }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <HiOutlineExclamationTriangle className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-lg font-medium text-gray-600 mb-2">Page not found</h2>
        <p className="text-sm text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm">
            Go Back
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm">
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
