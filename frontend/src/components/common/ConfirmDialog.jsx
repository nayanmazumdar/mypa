import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

/**
 * Confirmation dialog for destructive actions.
 * Usage: <ConfirmDialog open={bool} title="Delete?" message="..." onConfirm={fn} onCancel={fn} />
 */
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = true }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-sm p-6 rounded-3xl" style={{ background: '#e8edf5', boxShadow: '10px 10px 20px #c8cfd8, -10px -10px 20px #ffffff' }}>
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}
          >
            <HiOutlineExclamationTriangle className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-yellow-500'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger text-sm' : 'btn-primary text-sm'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
