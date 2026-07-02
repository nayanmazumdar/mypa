import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlinePlus } from 'react-icons/hi2';
import { fetchPurchases } from '../store/purchaseSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Purchase() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.purchases);

  useEffect(() => {
    dispatch(fetchPurchases({ page: 1, limit: 20 }));
  }, [dispatch]);

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500">Manage your purchase orders</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> New Purchase
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No purchases recorded yet.
                  </td>
                </tr>
              ) : (
                items.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-600">{purchase.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-700">{purchase.supplier_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{purchase.net_amount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {purchase.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        purchase.status === 'completed' ? 'bg-green-100 text-green-700' :
                        purchase.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{purchase.purchase_date}</td>
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
