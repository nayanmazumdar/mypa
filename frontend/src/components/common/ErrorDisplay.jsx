import { useNavigate } from 'react-router-dom';
import { HiOutlineExclamationTriangle, HiOutlineArrowPath, HiOutlineArrowLeft, HiOutlineLockClosed, HiOutlineClock } from 'react-icons/hi2';

/**
 * Full-page error display with user-friendly message and action button.
 * Used when a page fails to load.
 */
export function PageError({ error, onRetry }) {
  const navigate = useNavigate();
  const { icon, title, message, actions } = getErrorDisplay(error);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${icon.bg}`}>
        <icon.component className={`w-8 h-8 ${icon.color}`} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 text-center max-w-md mb-6">{message}</p>
      <div className="flex gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleAction(action.type, { navigate, onRetry })}
            className={i === 0 ? 'btn-primary' : 'btn-secondary'}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline error banner with dismiss and retry options.
 * Used inside pages when a specific operation fails.
 */
export function InlineError({ error, onRetry, onDismiss }) {
  const { message, actions } = getErrorDisplay(error);

  return (
    <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
      <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-red-800 font-medium">{message}</p>
        {error?.details && (
          <p className="text-xs text-red-600 mt-1">{error.details}</p>
        )}
        <div className="flex gap-2 mt-3">
          {onRetry && (
            <button onClick={onRetry} className="text-xs font-medium text-red-700 hover:text-red-900 flex items-center gap-1">
              <HiOutlineArrowPath className="w-3.5 h-3.5" /> Retry
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="text-xs font-medium text-gray-500 hover:text-gray-700">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state with optional error context.
 * Used when list is empty or fetch returned no results.
 */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-4">{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Map error response to user-friendly display config
 */
function getErrorDisplay(error) {
  const code = error?.code || error?.response?.data?.code || 'INTERNAL';
  const serverMessage = error?.message || error?.response?.data?.message || '';

  const displays = {
    AUTH_REQUIRED: {
      icon: { component: HiOutlineLockClosed, bg: 'bg-yellow-100', color: 'text-yellow-600' },
      title: 'Login Required',
      message: 'Please login to access this page.',
      actions: [{ type: 'login', label: 'Go to Login' }],
    },
    TOKEN_EXPIRED: {
      icon: { component: HiOutlineClock, bg: 'bg-yellow-100', color: 'text-yellow-600' },
      title: 'Session Expired',
      message: 'Your session has expired. Please login again to continue.',
      actions: [{ type: 'login', label: 'Login Again' }],
    },
    FORBIDDEN: {
      icon: { component: HiOutlineLockClosed, bg: 'bg-red-100', color: 'text-red-600' },
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
      actions: [{ type: 'go_back', label: 'Go Back' }, { type: 'login', label: 'Switch Account' }],
    },
    NOT_FOUND: {
      icon: { component: HiOutlineExclamationTriangle, bg: 'bg-gray-100', color: 'text-gray-500' },
      title: 'Not Found',
      message: 'The page or resource you are looking for does not exist.',
      actions: [{ type: 'go_back', label: 'Go Back' }, { type: 'home', label: 'Go Home' }],
    },
    RATE_LIMITED: {
      icon: { component: HiOutlineClock, bg: 'bg-orange-100', color: 'text-orange-600' },
      title: 'Slow Down',
      message: 'You have made too many requests. Please wait a moment and try again.',
      actions: [{ type: 'wait', label: 'Wait & Retry' }],
    },
    SERVICE_UNAVAILABLE: {
      icon: { component: HiOutlineExclamationTriangle, bg: 'bg-orange-100', color: 'text-orange-600' },
      title: 'Service Unavailable',
      message: 'The server is temporarily unavailable. Please try again in a few seconds.',
      actions: [{ type: 'retry', label: 'Retry' }],
    },
    DUPLICATE: {
      icon: { component: HiOutlineExclamationTriangle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
      title: 'Already Exists',
      message: serverMessage || 'This record already exists. Please use different values.',
      actions: [{ type: 'fix_input', label: 'Fix & Retry' }],
    },
    VALIDATION_FAILED: {
      icon: { component: HiOutlineExclamationTriangle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
      title: 'Invalid Input',
      message: serverMessage || 'Please check your input and fix the errors.',
      actions: [{ type: 'fix_input', label: 'Fix Input' }],
    },
    INTERNAL: {
      icon: { component: HiOutlineExclamationTriangle, bg: 'bg-red-100', color: 'text-red-600' },
      title: 'Something Went Wrong',
      message: serverMessage || 'An unexpected error occurred. Please try again.',
      actions: [{ type: 'retry', label: 'Try Again' }, { type: 'home', label: 'Go Home' }],
    },
  };

  return displays[code] || displays.INTERNAL;
}

/**
 * Execute action based on type
 */
function handleAction(type, { navigate, onRetry }) {
  switch (type) {
    case 'login':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      break;
    case 'go_back':
      navigate(-1);
      break;
    case 'home':
      navigate('/dashboard');
      break;
    case 'retry':
    case 'wait':
      if (onRetry) onRetry();
      else window.location.reload();
      break;
    case 'fix_input':
      // Just close - let user fix input
      break;
    default:
      break;
  }
}
