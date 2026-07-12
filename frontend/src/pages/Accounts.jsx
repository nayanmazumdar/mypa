import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineBanknotes, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown } from 'react-icons/hi2';
import { posApi, expenseApi } from '../api/pos.api';
import { PageHeader, FilterTabs, Modal, Pagination, FormField, FormRow } from '../components/common';
import { usePermission } from '../hooks/usePermission';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Accounts() {
  usePageTitle('Accounts');
  const [summary, setSummary] = useState({ total_transactions: 0, total_revenue: 0, total_expenses: 0, net_income: 0 });
  const [expenses, setExpenses] = useState([]);
  const [expensePagination, setExpensePagination] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [txPagination, setTxPagination] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '', payment_method: 'cash', expense_date: new Date().toISOString().split('T')[0] });
  const [activeTab, setActiveTab] = useState('overview');
  const [txPage, setTxPage] = useState(1);
  const [expPage, setExpPage] = useState(1);
  const { can } = usePermission();

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [txPage]);

  useEffect(() => {
    loadExpenses();
  }, [expPage]);

  const loadSummary = async () => {
    try {
      const [summaryRes, expSummaryRes] = await Promise.allSettled([
        posApi.getTodaySummary(),
        expenseApi.getSummary({}),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (expSummaryRes.status === 'fulfilled') setExpenseSummary(expSummaryRes.value.data);
    } catch {
      toast.error('Failed to load summary');
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await posApi.getTransactions({ page: txPage, limit: 20 });
      setTransactions(res.data || []);
      setTxPagination(res.pagination || null);
    } catch { /* silent */ }
  };

  const loadExpenses = async () => {
    try {
      const res = await expenseApi.getAll({ page: expPage, limit: 20 });
      setExpenses(res.data || []);
      setExpensePagination(res.pagination || null);
    } catch { /* silent */ }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await expenseApi.create({ ...expenseForm, amount: parseFloat(expenseForm.amount) });
      toast.success('Expense recorded');
      setShowExpenseModal(false);
      setExpenseForm({ category: '', description: '', amount: '', payment_method: 'cash', expense_date: new Date().toISOString().split('T')[0] });
      loadExpenses();
      loadSummary();
    } catch {
      toast.error('Failed to record expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseApi.delete(id);
      toast.success('Expense deleted');
      loadExpenses();
      loadSummary();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const expenseCategories = ['Rent', 'Electricity', 'Staff Salary', 'Transport', 'Packaging', 'Maintenance', 'Wastage', 'Other'];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounts"
        subtitle="Today's financial overview"
        action={can('expenses:create') ? 'Add Expense' : null}
        onAction={() => setShowExpenseModal(true)}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <HiOutlineBanknotes className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Today's Revenue</p>
            <p className="text-xl font-bold text-gray-800">₹{parseFloat(summary.total_revenue || 0).toFixed(0)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <HiOutlineArrowTrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Transactions</p>
            <p className="text-xl font-bold text-gray-800">{summary.total_transactions || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <HiOutlineArrowTrendingDown className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Today's Expenses</p>
            <p className="text-xl font-bold text-gray-800">₹{parseFloat(summary.total_expenses || 0).toFixed(0)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' }}>
            <HiOutlineBanknotes className={`w-6 h-6 ${(summary.net_income || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Net Income</p>
            <p className={`text-xl font-bold ${(summary.net_income || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              ₹{parseFloat(summary.net_income || 0).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <FilterTabs value={activeTab} onChange={setActiveTab} options={[
        { value: 'overview', label: 'Overview' },
        { value: 'transactions', label: 'Transactions' },
        { value: 'expenses', label: 'Expenses' },
      ]} />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown (This Month)</h3>
            {expenseSummary.length === 0 ? (
              <p className="text-gray-400 text-sm">No expenses this month</p>
            ) : (
              <div className="space-y-3">
                {expenseSummary.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{cat.category}</span>
                    <span className="text-sm font-medium">₹{parseFloat(cat.total).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-sm">No transactions today</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-medium">{tx.receipt_number}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className="text-sm font-medium text-green-600">₹{tx.net_amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="rounded-3xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "rgba(200,207,216,0.2)" }}>
              <tr>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Receipt</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Payment</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="">
              {transactions.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-14 text-center text-gray-400 text-sm">No transactions found.</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="transition-colors" style={{ }}>
                  <td className="px-5 py-4 font-medium text-primary-600">{tx.receipt_number}</td>
                  <td className="px-5 py-4 text-gray-500">{tx.customer_name || 'Walk-in'}</td>
                  <td className="px-5 py-4 text-right font-medium">₹{tx.net_amount}</td>
                  <td className="px-5 py-4 capitalize text-gray-500">{tx.payment_method}</td>
                  <td className="px-5 py-4 text-gray-400">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={txPagination} page={txPage} onPageChange={setTxPage} />
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="rounded-3xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "rgba(200,207,216,0.2)" }}>
              <tr>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="">
              {expenses.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-14 text-center text-gray-400 text-sm">No expenses recorded.</td></tr>
              ) : expenses.map((exp) => (
                <tr key={exp.id} className="transition-colors" style={{ }}>
                  <td className="px-5 py-4 font-medium">{exp.category}</td>
                  <td className="px-5 py-4 text-gray-500">{exp.description || '-'}</td>
                  <td className="px-5 py-4 text-right font-medium text-red-600">₹{exp.amount}</td>
                  <td className="px-5 py-4 text-gray-400">{exp.expense_date}</td>
                  <td className="px-5 py-4 text-center">
                    {can('expenses:delete') && <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination pagination={expensePagination} page={expPage} onPageChange={setExpPage} />
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal open={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select required value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="input w-full">
              <option value="">Select category</option>
              {expenseCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input type="number" step="0.01" min="0.01" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={expenseForm.payment_method} onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })} className="input w-full">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} className="input w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Expense</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
