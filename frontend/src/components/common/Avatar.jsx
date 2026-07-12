const colors = [
  'bg-primary-50 text-primary-700',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-rose-50 text-rose-700',
  'bg-blue-50 text-blue-700',
  'bg-purple-50 text-purple-700',
  'bg-cyan-50 text-cyan-700',
  'bg-orange-50 text-orange-700',
];

/**
 * Avatar with initial letter and consistent color based on name.
 *
 * @example
 * <Avatar name="Rahul Sharma" />
 * <Avatar name="Priya" size="lg" />
 */
export default function Avatar({ name, size = 'md', src, className = '' }) {
  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        className={`${sizes[size]} rounded-xl object-cover border border-gray-100 flex-shrink-0 ${className}`}
      />
    );
  }

  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-semibold flex-shrink-0 ${colors[colorIdx]} ${className}`}
      style={{ boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}
    >
      {initial}
    </div>
  );
}
