import { HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2';

/**
 * Search input with icon and optional clear button.
 *
 * @example
 * <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
 */
export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-11 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <HiOutlineXMark className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
