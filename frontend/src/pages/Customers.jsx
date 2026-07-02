import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi2';
import { fetchCustomers } from '../store/customerSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Customers() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.customers);

  useEffect(() => {
    dispatch(fetchCustomers({ page: 1, limit: 20 }));
  }, [dispatch]);

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">Manage your customer base</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No customers added yet.
                  </td>
                </tr>
              ) : (
                items.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-500">{customer.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{customer.email || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{customer.balance || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        customer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {customer.is_active ? 'Active' : 'Inactive'}
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
