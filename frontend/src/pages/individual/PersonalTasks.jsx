import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import Modal from '../../components/common/Modal';

// ── Config ────────────────────────────────────────────────────────────────────
const PRIORITY = {
  high:   { label: 'High',   dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',       order: 0 },
  medium: { label: 'Medium', dot: 'bg-yellow-400',  badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', order: 1 },
  low:    { label: 'Low',    dot: 'bg-green-500',   badge: 'bg-green-100 text-green-700 border-green-200',  order: 2 },
};

const STATUS = {
  pending:     { label: 'Pending',     Icon: HiOutlineClock,            cls: 'text-yellow-500', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  in_progress: { label: 'In Progress', Icon: HiOutlineArrowPath,         cls: 'text-blue-500',   bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:   { label: 'Done',        Icon: HiOutlineCheckCircle,       cls: 'text-green-500',  bg: 'bg-green-50 text-green-700 border-green-200' },
  cancelled:   { label: 'Cancelled',   Icon: HiOutlineXCircle,           cls: 'text-gray-400',   bg: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORITY_ORDER = ['high', 'medium', 'low'];

const emptyForm = { title: '', description: '', priority: 'medium', status: 'pending', due_date: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

function fmtDate(raw) {
  if (!raw) return null;
  const part = raw.length > 10 ? raw.substring(0, 10) : raw;
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dueDateStatus(raw, status) {
  if (!raw || status === 'completed' || status === 'cancelled') return 'none';
  const part = raw.length > 10 ? raw.substring(0, 10) : raw;
  const today = todayStr();
  if (part < today) return 'overdue';
  if (part === today) return 'today';
  return 'upcoming';
}

// ═════════════════════════════════════════════════════════════════════════════
export default function PersonalTasks() {
  const location = useLocation();
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [view, setView] = useState('priority'); // 'priority' | 'list'

  // Auto-open modal from ?add=1
  useEffect(() => {
    if (new URLSearchParams(location.search).get('add') === '1') openCreate();
  }, [location.search]);

  useEffect(() => { loadTasks(); }, [filterStatus, filterPriority]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus)   params.status   = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await individualApi.getTasks(params);
      const rows = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setTasks(rows);
    } catch (err) {
      console.error('loadTasks error:', err?.message || err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (task) => {
    setEditingId(task.id);
    setForm({
      title:       task.title,
      description: task.description || '',
      priority:    task.priority,
      status:      task.status,
      due_date:    task.due_date ? (task.due_date.length > 10 ? task.due_date.substring(0, 10) : task.due_date) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, due_date: form.due_date || null };
      if (editingId) {
        await individualApi.updateTask(editingId, payload);
        toast.success('Task updated');
      } else {
        await individualApi.createTask(payload);
        toast.success('Task created');
      }
      setShowModal(false);
      loadTasks();
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save task');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await individualApi.deleteTask(id);
      toast.success('Task deleted');
      loadTasks();
    } catch { toast.error('Failed to delete task'); }
  };

  // Quick status cycle: pending → in_progress → completed → pending
  const cycleStatus = async (task) => {
    const cycle = { pending: 'in_progress', in_progress: 'completed', completed: 'pending', cancelled: 'pending' };
    const newStatus = cycle[task.status] || 'pending';
    try {
      await individualApi.updateTask(task.id, {
        title: task.title, description: task.description, priority: task.priority,
        status: newStatus, due_date: task.due_date || null,
      });
      loadTasks();
    } catch { toast.error('Failed to update status'); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total     = tasks.length;
  const pending   = tasks.filter((t) => t.status === 'pending').length;
  const inProg    = tasks.filter((t) => t.status === 'in_progress').length;
  const done      = tasks.filter((t) => t.status === 'completed').length;
  const overdue   = tasks.filter((t) => dueDateStatus(t.due_date, t.status) === 'overdue').length;
  const dueToday  = tasks.filter((t) => dueDateStatus(t.due_date, t.status) === 'today').length;

  // ── Priority groups ───────────────────────────────────────────────────────
  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = tasks.filter((t) => t.priority === p);
    return acc;
  }, {});

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">Plan, prioritise and track your activities</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: total,    color: 'bg-indigo-50 text-indigo-700',  border: 'border-indigo-100' },
          { label: 'Pending',     value: pending,  color: 'bg-yellow-50 text-yellow-700',  border: 'border-yellow-100' },
          { label: 'In Progress', value: inProg,   color: 'bg-blue-50 text-blue-700',      border: 'border-blue-100' },
          { label: 'Completed',   value: done,     color: 'bg-green-50 text-green-700',    border: 'border-green-100' },
          { label: 'Overdue',     value: overdue,  color: 'bg-red-50 text-red-700',        border: 'border-red-100' },
          { label: 'Due Today',   value: dueToday, color: 'bg-orange-50 text-orange-700',  border: 'border-orange-100' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl border ${s.border} p-3 text-center shadow-sm`}>
            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters + view toggle ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <HiOutlineFunnel className="w-4 h-4 text-gray-400 flex-shrink-0" />

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field text-sm py-1.5 w-auto"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input-field text-sm py-1.5 w-auto"
          >
            <option value="">All priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          {(filterStatus || filterPriority) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterPriority(''); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 py-1.5 px-2.5 border border-gray-200 rounded-lg"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('priority')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'priority' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              By Priority
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              All Tasks
            </button>
          </div>
        </div>
      </div>

      {/* ── Task content ── */}
      {loading ? (
        <div className="flex justify-center py-14">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16">
          <HiOutlineClipboardDocumentList className="w-12 h-12 mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No tasks yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first task to get started</p>
          <button onClick={openCreate} className="mt-4 btn-primary text-sm flex items-center gap-1.5">
            <HiOutlinePlus className="w-4 h-4" /> New Task
          </button>
        </div>
      ) : view === 'priority' ? (
        /* ── Priority grouped view ── */
        <div className="space-y-5">
          {PRIORITY_ORDER.map((p) => {
            const group = grouped[p];
            if (group.length === 0) return null;
            const cfg = PRIORITY[p];
            return (
              <div key={p}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="text-sm font-semibold text-gray-700">{cfg.label} Priority</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.length}</span>
                </div>
                <div className="space-y-2">
                  {group.map((task) => <TaskCard key={task.id} task={task} onEdit={openEdit} onDelete={handleDelete} onCycle={cycleStatus} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Flat list view ── */
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={openEdit} onDelete={handleDelete} onCycle={cycleStatus} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text" required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field" placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="Optional details"
            />
          </div>

          {/* Priority selector — visual buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_ORDER.map((p) => {
                const cfg = PRIORITY[p];
                const active = form.priority === p;
                return (
                  <button
                    key={p} type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? `${cfg.badge} border-current shadow-sm`
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-field"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting
                ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</span>
                : editingId ? 'Update Task' : 'Create Task'
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── TaskCard component ────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onCycle }) {
  const statusCfg   = STATUS[task.status]   || STATUS.pending;
  const priorityCfg = PRIORITY[task.priority] || PRIORITY.medium;
  const StatusIcon  = statusCfg.Icon;
  const dueStatus   = dueDateStatus(task.due_date, task.status);
  const done        = task.status === 'completed';
  const cancelled   = task.status === 'cancelled';

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all ${
      done || cancelled
        ? 'border-gray-100 opacity-60'
        : dueStatus === 'overdue'
        ? 'border-red-200 bg-red-50/20'
        : dueStatus === 'today'
        ? 'border-orange-200 bg-orange-50/20'
        : 'border-gray-200 hover:border-indigo-200 hover:shadow-sm'
    }`}>

      {/* Status cycle button */}
      <button
        onClick={() => onCycle(task)}
        title={`Status: ${statusCfg.label} — click to advance`}
        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          done
            ? 'bg-green-500 border-green-500 text-white'
            : cancelled
            ? 'border-gray-300 bg-gray-100 text-gray-400'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
        }`}
      >
        {done && <HiOutlineCheckCircle className="w-3.5 h-3.5" />}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className={`text-sm font-medium leading-snug ${done || cancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Priority badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${priorityCfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
              {priorityCfg.label}
            </span>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg}`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </span>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{task.description}</p>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs ${
            dueStatus === 'overdue' ? 'text-red-600 font-medium'
            : dueStatus === 'today' ? 'text-orange-600 font-medium'
            : 'text-gray-400'
          }`}>
            {dueStatus === 'overdue' && <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />}
            {dueStatus === 'overdue' ? 'Overdue · ' : dueStatus === 'today' ? '📅 Due today · ' : 'Due: '}
            {fmtDate(task.due_date)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="Edit"
        >
          <HiOutlinePencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
