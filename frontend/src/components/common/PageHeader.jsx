import { HiOutlinePlus } from 'react-icons/hi2';

/**
 * Consistent page header with title, subtitle, and optional action button.
 *
 * @example
 * <PageHeader title="Products" subtitle="50 items" action="Add Product" onAction={openCreate} />
 */
export default function PageHeader({ title, subtitle, action, onAction, actionIcon: ActionIcon = HiOutlinePlus, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {action && onAction && (
          <button onClick={onAction} className="btn-primary flex items-center gap-2 text-sm">
            <ActionIcon className="w-4 h-4" /> {action}
          </button>
        )}
      </div>
    </div>
  );
}
