/**
 * Segmented control / pill-button group for filtering.
 *
 * @example
 * <FilterTabs
 *   value={statusFilter}
 *   onChange={setStatusFilter}
 *   options={[
 *     { value: '', label: 'All' },
 *     { value: 'completed', label: 'Completed' },
 *     { value: 'pending', label: 'Pending' },
 *   ]}
 * />
 */
export default function FilterTabs({ value, onChange, options = [] }) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-2xl" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            value === opt.value ? 'text-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
          style={value === opt.value ? { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' } : {}}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className="ml-1 text-[10px] text-gray-400">({opt.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
