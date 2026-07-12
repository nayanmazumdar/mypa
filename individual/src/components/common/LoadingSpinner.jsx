export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}
      >
        <div className={`${sizes[size]} border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
      </div>
      {text && <p className="text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  );
}
