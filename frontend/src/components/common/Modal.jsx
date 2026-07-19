import { useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[10vh] sm:items-center sm:pt-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={`relative w-full ${sizeClasses[size] || sizeClasses.md} max-h-[85vh] flex flex-col rounded-3xl`}
        style={{
          background: '#e8edf5',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 10px 25px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,207,216,0.4)' }}>
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
            style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            aria-label="Close modal"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-7 py-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
