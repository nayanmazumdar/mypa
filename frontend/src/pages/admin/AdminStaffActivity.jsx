import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineBuildingStorefront,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineArrowPath,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  inset:  { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
  card:   { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminStaffActivity() {
  usePageTitle('Staff Activity');
  const { user } = useSelector((s) => s.auth);

  const [loading,  setLoading]  = useState(true);
  const [shops,    setShops]    = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [expanded, setExpanded] = useState(null); // user_name expanded

  const [filters, setFilters] = useState({
    shop_id:   '',
    date_from: today(),
    date_to:   today(),
  });

  // ── Load shops ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/shops');
        const s = res.data || [];
        setShops(s);
        if (s.length) setFilters(f => ({ ...f, shop_id: String(s[0].id) }));
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Load data when filters change ───────────────
  const loadData = useCallback(async () => {
    if (!filters.shop_id) return;
    setLoading(true);
    try {
      // Load login logs for date range
      const logsPromises = [];
      const start = new Date(filters.date_from);
      const end = new Date(filters.date_to);
      // If range is <= 7 days, fetch day by day; otherwise fetch the range summary
      const dayDiff = Math.floor((end - start) / 86400000) + 1;
      const dates = [];
      for (let i = 0; i < Math.min(dayDiff, 31); i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }

      // Fetch all dates in parallel
      const logResults = await Promise.all(
        dates.map(d => api.get('/login-logs', { params: { date: d, shop_id: filters.shop_id } }).catch(() => ({ data: { logs: [] } })))
      );
      const allLogs = logResults.flatMap(r => r.data?.logs || r.logs || []);
      setLogs(allLogs);

      // Fetch attendance for the date range
      const attRes = await api.get('/attendance/admin', {
        params: {
          shop_id:   filters.shop_id,
          date_from: filters.date_from,
          date_to:   filters.date_to,
        },
      }).catch(() => ({ data: [] }));
      setAttendance(attRes.data || []);
    } catch {
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Compute staff summary ───────────────────────
  const staffSummary = useMemo(() => {
    // Group login logs by user_name
    const map = {};

    for (const log of logs) {
      const key = log.user_name || log.user_email;
      if (!map[key]) {
        map[key] = {
          name:        log.user_name,
          email:       log.user_email,
          role:        log.role,
          shop_name:   log.shop_name,
          sessions:    [],
          totalMinutes: 0,
          isOnline:    false,
        };
      }
      map[key].sessions.push(log);
      if (log.duration_minutes != null) {
        map[key].totalMinutes += log.duration_minutes;
      }
      if (!log.logout_at) {
        map[key].isOnline = true;
      }
    }

    // Merge attendance info
    for (const att of attendance) {
      const key = att.staff_name || att.staff_email;
      if (!map[key]) {
        map[key] = {
          name:        att.staff_name,
          email:       att.staff_email,
          role:        att.role || 'staff',
          shop_name:   att.shop_name,
          sessions:    [],
          totalMinutes: 0,
          isOnline:    false,
        };
      }
      // If attendance has check_in/check_out, add the duration
      if (att.check_in && att.check_out) {
        const diff = (new Date(`${att.date}T${att.check_out}`) - new Date(`${att.date}T${att.check_in}`)) / 60000;
        if (diff > 0 && !map[key].sessions.find(s => s.id === `att_${att.id}`)) {
          map[key].totalMinutes += diff;
        }
      }
    }

    return Object.values(map).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [logs, attendance]);

  const totalHours   = staffSummary.reduce((s, u) => s + u.totalMinutes, 0);
  const activeCount  = staffSummary.filter(u => u.isOnline).length;
  const staffCount   = staffSummary.length;

  const formatDuration = (mins) => {
    if (mins == null || mins === 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineCalendarDays className="w-6 h-6 text-primary-600" />
            Staff Activity
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Attendance, login sessions, and total hours worked.
          </p>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors self-start sm:self-auto"
          style={NEO.card}>
          <HiOutlineArrowPath className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl p-4" style={NEO.raised}>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Shop</label>
            <select value={filters.shop_id}
              onChange={(e) => setFilters(f => ({ ...f, shop_id: e.target.value }))}
              className="input-field text-sm py-2 pr-8 min-w-[160px]">
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">From</label>
            <input type="date" value={filters.date_from}
              onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="input-field text-sm py-2" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">To</label>
            <input type="date" value={filters.date_to}
              onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="input-field text-sm py-2" />
          </div>
          <button onClick={loadData} className="btn-primary text-sm px-5 py-2">Apply</button>
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && staffSummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<HiOutlineUserGroup className="w-5 h-5 text-primary-500" />}
            label="Staff" value={staffCount} color="text-gray-800" />
          <StatCard icon={<HiOutlineCheckCircle className="w-5 h-5 text-green-500" />}
            label="Active Now" value={activeCount} color="text-green-600" />
          <StatCard icon={<HiOutlineClock className="w-5 h-5 text-blue-500" />}
            label="Total Hours" value={formatDuration(totalHours)} color="text-blue-600" />
          <StatCard icon={<HiOutlineCalendarDays className="w-5 h-5 text-purple-500" />}
            label="Sessions" value={logs.length} color="text-purple-600" />
        </div>
      )}

      {/* ── Staff list with expandable sessions ── */}
      {loading ? (
        <LoadingSpinner />
      ) : staffSummary.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={NEO.raised}>
          <HiOutlineCalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No activity found</p>
          <p className="text-xs text-gray-400 mt-1">Try selecting a different shop or date range.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staffSummary.map((staff) => {
            const isExpanded = expanded === staff.name;
            return (
              <div key={staff.name} className="rounded-2xl overflow-hidden" style={NEO.raised}>
                {/* ── Summary row ── */}
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                     onClick={() => setExpanded(isExpanded ? null : staff.name)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-semibold text-sm">
                        {staff.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{staff.name}</p>
                        {staff.isOnline && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Online
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{staff.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-gray-800">{formatDuration(staff.totalMinutes)}</p>
                      <p className="text-[10px] text-gray-400">{staff.sessions.length} session{staff.sessions.length !== 1 ? 's' : ''}</p>
                    </div>
                    <RoleBadge role={staff.role} />
                    {isExpanded
                      ? <HiOutlineChevronUp className="w-4 h-4 text-gray-400" />
                      : <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* ── Expanded: session details ── */}
                {isExpanded && (
                  <div className="border-t border-gray-200/50 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <HiOutlineClock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Login Sessions
                      </span>
                      <span className="text-xs text-gray-400 ml-auto sm:hidden font-bold">
                        Total: {formatDuration(staff.totalMinutes)}
                      </span>
                    </div>

                    {staff.sessions.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">No sessions recorded in this period.</p>
                    ) : (
                      <>
                        {/* Mobile sessions */}
                        <div className="sm:hidden space-y-2">
                          {staff.sessions.map((s, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100/50 last:border-0">
                              <div>
                                <p className="text-xs text-gray-500 font-mono">{s.date}</p>
                                <p className="text-sm text-gray-700">
                                  <span className="text-green-600">{fmtTime(s.login_at)}</span>
                                  {' → '}
                                  {s.logout_at
                                    ? <span className="text-red-500">{fmtTime(s.logout_at)}</span>
                                    : <span className="text-green-600 font-medium">Active</span>}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-gray-600">
                                {s.duration_minutes != null ? formatDuration(s.duration_minutes) : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Desktop sessions table */}
                        <table className="hidden sm:table w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                              <th className="text-left pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Login</th>
                              <th className="text-left pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Logout</th>
                              <th className="text-right pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                              <th className="text-center pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staff.sessions.map((s, i) => (
                              <tr key={i} className="border-t border-gray-100/50">
                                <td className="py-2 text-xs text-gray-500 font-mono">{s.date}</td>
                                <td className="py-2 text-green-700 font-mono">{fmtTime(s.login_at)}</td>
                                <td className="py-2 font-mono">
                                  {s.logout_at
                                    ? <span className="text-gray-600">{fmtTime(s.logout_at)}</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="py-2 text-right font-semibold text-gray-700">
                                  {s.duration_minutes != null ? formatDuration(s.duration_minutes) : '—'}
                                </td>
                                <td className="py-2 text-center">
                                  {s.logout_at
                                    ? <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Done</span>
                                    : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 justify-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Active
                                      </span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-gray-200/60">
                            <tr>
                              <td colSpan={3} className="py-2 text-[11px] text-gray-400 font-medium">
                                {staff.sessions.length} session{staff.sessions.length !== 1 ? 's' : ''}
                              </td>
                              <td className="py-2 text-right text-sm font-bold text-primary-600">
                                {formatDuration(staff.totalMinutes)}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center gap-1" style={{
      background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff',
    }}>
      {icon}
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin:   'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    staff:   'bg-gray-100 text-gray-600',
  };
  const labels = { admin: 'Owner', manager: 'Manager', staff: 'Staff' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[role] || styles.staff}`}>
      {labels[role] || role || 'Staff'}
    </span>
  );
}

function fmtTime(dt) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dt).slice(11, 16);
  }
}
