/**
 * Consistent form field with label + input. Handles text, number, select, textarea.
 * Uses neomorphic inset styling for inputs.
 */
export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
  options = [],
  rows = 3,
  step,
  min,
  max,
  disabled,
  className = '',
  ...props
}) {
  const handleChange = (e) => onChange(e.target.value);

  const baseClass = `input-field ${className}`;
  const errorStyle = error ? { boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff, 0 0 0 2px rgba(239,68,68,0.2)' } : {};

  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          {label}{required && ' *'}
        </label>
      )}

      {type === 'select' ? (
        <select value={value} onChange={handleChange} disabled={disabled} className={baseClass} style={errorStyle} {...props}>
          {options.map((opt) =>
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          )}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          rows={rows}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseClass}
          style={errorStyle}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className={baseClass}
          style={errorStyle}
          {...props}
        />
      )}

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

/**
 * Group multiple FormFields in a responsive grid.
 */
export function FormRow({ cols = 2, children }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClass[cols] || gridClass[2]} gap-4`}>
      {children}
    </div>
  );
}

/**
 * Neomorphic section divider within forms (pressed/inset container).
 */
export function FormSection({ title, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-4 space-y-4 ${className}`}
      style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}
    >
      {title && <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">{title}</p>}
      {children}
    </div>
  );
}
