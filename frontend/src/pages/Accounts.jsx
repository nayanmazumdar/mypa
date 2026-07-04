import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineBanknotes, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown } from 'react-icons/hi2';
import { posApi, expenseApi } from '../api/pos.api';
import Modal from '../components/common/Modal';

export default function Accounts() {
  const [summary, setSummary] = useState({ total_transactions: 0, total_revenue: 0, total_expenses: 0, net_income: 0 });
  const [expenses, setExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '', payment_method: 'cash', expense_date: new Date().toISOString().split('T')[0] });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, expensesRes, expSummaryRes, txRes] = await Promise.allSettled([
        posApi.getTodaySummary(),
        expenseApi.getAll({ page: 1, limit: 20 }),
        expenseApi.getSummary({}),
        posApi.getTransactions({ page: 1, limit: 20 }),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (expensesRes.status === 'fulfilled') setExpenses(expensesRes.value.data);
      if (expSummaryRes.status === 'fulfilled') setExpenseSummary(expSummaryRes.value.data);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data);
    } catch {
      toast.error('Failed to load accounts data');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await expenseApi.create({ ...expenseForm, amount: parseFloat(expenseForm.amount) });
      toast.success('Expense recorded');
      setShowExpenseModal(false);
      setExpenseForm({ category: '', description: '', amount: '', payment_method: 'cash', expense_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch {
      toast.error('Failed to record expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseApi.delete(id);
      toast.success('Expense deleted');
      loadData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const expenseCategories = ['Rent', 'Electricity', 'Staff Salary', 'Transport', 'Packaging', 'Maintenance', 'Wastage', 'Other'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500">Today's financial overview</p>
        </div>
        <button onClick={() => setShowExpenseModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <HiOutlineBanknotes className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Today's Revenue</p>
            <p className="text-xl font-bold text-gray-900">₹{parseFloat(summary.total_revenue).toFixed(0)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <HiOutlineArrowTrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="text-xl font-bold text-gray-900">{summary.total_transactions}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
            <HiOutlineArrowTrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Today's Expenses</p>
            <p className="text-xl font-bold text-gray-900">₹{parseFloat(summary.total_expenses).toFixed(0)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${summary.net_income >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <HiOutlineBanknotes className={`w-6 h-6 ${summary.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Net Income</p>
            <p className={`text-xl font-bold ${summary.net_income >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ₹{parseFloat(summary.net_income).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['overview', 'transactions', 'expenses'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

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
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Receipt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-primary-600">{tx.receipt_number}</td>
                  <td className="px-4 py-3 text-gray-500">{tx.customer_name || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{tx.net_amount}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">{tx.payment_method}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{exp.category}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.description || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">₹{exp.amount}</td>
                  <td className="px-4 py-3 text-gray-400">{exp.expense_date}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-400 hover:text-red-600">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal open={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              required
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="input-field"
            >
              <option value="">Select category</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={expenseForm.payment_method}
                onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                className="input-field"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                className="input-field"
              />
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
