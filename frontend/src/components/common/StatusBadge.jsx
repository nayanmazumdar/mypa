const colorMap = {
  green: 'text-emerald-700',
  red: 'text-red-600',
  yellow: 'text-amber-700',
  blue: 'text-blue-700',
  gray: 'text-gray-600',
  purple: 'text-purple-700',
};

/**
 * Neomorphic status badge pill.
 */
export default function StatusBadge({ label, color = 'gray' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${colorMap[color] || colorMap.gray}`}
      style={{ background: '#e8edf5', boxShadow: 'inset 1.5px 1.5px 3px #c8cfd8, inset -1.5px -1.5px 3px #ffffff' }}
    >
      {label}
    </span>
  );
}
