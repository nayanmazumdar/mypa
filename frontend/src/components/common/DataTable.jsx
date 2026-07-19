/**
 * Reusable data table with card wrapper, responsive columns, and consistent styling.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'name', label: 'Name' },
 *     { key: 'price', label: 'Price', align: 'right' },
 *     { key: 'actions', label: 'Actions', align: 'center' },
 *   ]}
 *   data={items}
 *   renderRow={(item) => (
 *     <tr key={item.id}>
 *       <td className="td">{item.name}</td>
 *       <td className="td text-right">₹{item.price}</td>
 *     </tr>
 *   )}
 *   emptyState={<EmptyState ... />}
 *   pagination={pagination}
 *   page={page}
 *   onPageChange={setPage}
 * />
 */
export default function DataTable({ columns = [], data = [], renderRow, emptyState, pagination, page, onPageChange }) {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(200,207,216,0.2)' }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 ${
                    col.align === 'right' ? 'text-right' :
                    col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''} ${col.hideOn ? `hidden ${col.hideOn}:table-cell` : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState || (
                    <div className="px-5 py-14 text-center text-gray-400 text-sm">No data found.</div>
                  )}
                </td>
              </tr>
            ) : (
              data.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <Pagination pagination={pagination} page={page} onPageChange={onPageChange} />
      )}
    </div>
  );
}

/**
 * Pagination bar — automatically used by DataTable but can be used standalone too.
 *
 * @example
 * <Pagination pagination={{ total: 100, totalPages: 5 }} page={2} onPageChange={setPage} />
 */
export function Pagination({ pagination, page, onPageChange }) {
  if (!pagination) return null;

  const { totalPages, total } = pagination;
  const limit = pagination.limit || (totalPages > 0 ? Math.ceil(total / totalPages) : 25);

  // Generate page numbers to show (max 5 visible)
  const getPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  // Always show the "Showing X–Y of Z" text, but only show page buttons if >1 page
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(200,207,216,0.4)', background: 'rgba(200,207,216,0.1)' }}>
      <span className="text-xs text-gray-500">
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </span>
      {totalPages > 1 && (
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}
        >
          ‹ Prev
        </button>
        {getPages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-xs font-medium rounded-lg transition-all ${p === page ? 'text-white' : 'text-gray-600'}`}
            style={p === page
              ? { background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }
              : { background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }
            }
          >
            {p}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}
        >
          Next ›
        </button>
      </div>
      )}
    </div>
  );
}
