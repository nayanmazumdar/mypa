import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi2';
import { fetchSuppliers } from '../store/supplierSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Suppliers() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.suppliers);

  useEffect(() => {
    dispatch(fetchSuppliers({ page: 1, limit: 20 }));
  }, [dispatch]);

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500">Manage your suppliers</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Add Supplier
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No suppliers added yet.
                  </td>
                </tr>
              ) : (
                items.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{supplier.name}</td>
                    <td className="px-4 py-3 text-gray-500">{supplier.company || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{supplier.phone || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{supplier.balance || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        supplier.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
