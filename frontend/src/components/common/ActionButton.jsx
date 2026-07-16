import { HiOutlinePencil, HiOutlineTrash, HiOutlineEye, HiOutlineXCircle, HiOutlineBanknotes, HiOutlinePlus } from 'react-icons/hi2';

const variants = {
  edit: { icon: HiOutlinePencil, hover: 'hover:text-primary-600 hover:bg-primary-50' },
  delete: { icon: HiOutlineTrash, hover: 'hover:text-red-600 hover:bg-red-50' },
  view: { icon: HiOutlineEye, hover: 'hover:text-blue-600 hover:bg-blue-50' },
  cancel: { icon: HiOutlineXCircle, hover: 'hover:text-red-600 hover:bg-red-50' },
  payment: { icon: HiOutlineBanknotes, hover: 'hover:text-emerald-600 hover:bg-emerald-50' },
  add: { icon: HiOutlinePlus, hover: 'hover:text-primary-600 hover:bg-primary-50' },
};

/**
 * Icon action button with consistent styling. Used in tables/cards for row actions.
 *
 * @example
 * <ActionButton variant="edit" onClick={() => openEdit(item)} title="Edit" />
 * <ActionButton variant="delete" onClick={() => handleDelete(item.id)} title="Delete" />
 */
export default function ActionButton({ variant = 'edit', onClick, title, icon: CustomIcon, disabled }) {
  const config = variants[variant] || variants.edit;
  const Icon = CustomIcon || config.icon;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-2 rounded-xl text-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${config.hover}`}
      style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/**
 * Group multiple ActionButtons together with consistent spacing.
 */
export function ActionGroup({ children }) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}
