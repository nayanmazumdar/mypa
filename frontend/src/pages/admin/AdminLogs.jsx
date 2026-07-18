import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  HiOutlineClock,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { LoadingSpinner } from '../../components/common';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function AdminLogs() {
  usePageTitle('Login Logs');
  const { user } = useSelector((state) => state.auth);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [logsDate, setLogsDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userShops = user?.shops || [];
    setShops(userShops);
    // Start with "All Shops" — null means fetch across all
  }, [user]);

  useEffect(() => {
    loadLogs();
  }, [selectedShopId, logsDate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = { date: logsDate };
      if (selectedShopId) params.shop_id = selectedShopId;
      const res = await api.get('/login-logs', { params });
      setLogs(res.data?.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineClipboardDocumentList className="w-6 h-6 text-primary-600" />
          Login Logs
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track staff login and logout activity</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {shops.length > 0 && (
          <>
            <label className="text-sm font-medium text-gray-700">Shop:</label>
            <select
              value={selectedShopId || ''}
              onChange={(e) => setSelectedShopId(e.target.value ? Number(e.target.value) : null)}
              className="input-field w-auto"
            >
              <option value="">All Shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </>
        )}
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <input
          type="date"
          value={logsDate}
          onChange={(e) => setLogsDate(e.target.value)}
          className="input-field w-auto"
        />
        {loading && (
          <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        )}
      </div>

      {/* Logs table */}
      <div className="rounded-3xl overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {/* ── Mobile: card list ── */}
        <div className="sm:hidden divide-y divide-gray-100">
          {!loading && logs.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-gray-400">No login activity for this date.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{log.user_name}</p>
                <RoleBadge role={log.role} />
              </div>
              <p className="text-xs text-gray-400">{log.user_email}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <HiOutlineClock className="w-3.5 h-3.5 text-green-500" />
                  {new Date(log.login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {log.logout_at ? (
                  <span className="flex items-center gap-1">
                    <HiOutlineClock className="w-3.5 h-3.5 text-red-400" />
                    {new Date(log.logout_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                )}
                {log.duration_minutes != null && (
                  <span className="text-gray-400">{log.duration_minutes}m</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop: table ── */}
        <table className="hidden sm:table w-full text-sm">
          <thead style={{ background: 'rgba(200,207,216,0.2)' }}>
            <tr>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Staff Member</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Login At</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Logout At</th>
              <th className="text-right px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Duration</th>
              <th className="text-center px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="px-5 py-14 text-center">
                  <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-14 text-center text-sm text-gray-400">
                  No login activity for this date.
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{log.user_name}</p>
                  <p className="text-xs text-gray-400">{log.user_email}</p>
                </td>
                <td className="px-5 py-4"><RoleBadge role={log.role} /></td>
                <td className="px-5 py-4 text-gray-700 tabular-nums">
                  {new Date(log.login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="px-5 py-4 text-gray-500 tabular-nums">
                  {log.logout_at
                    ? new Date(log.logout_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Still active</span>}
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-gray-500">
                  {log.duration_minutes != null ? `${log.duration_minutes} min` : '—'}
                </td>
                <td className="px-5 py-4 text-center">
                  {log.logout_at
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Logged out</span>
                    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Online</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {logs.length > 0 && (
            <tfoot style={{ background: 'rgba(200,207,216,0.1)', borderTop: '1px solid rgba(200,207,216,0.3)' }}>
              <tr>
                <td colSpan="4" className="px-5 py-3 text-xs text-gray-500">
                  {logs.length} session{logs.length !== 1 ? 's' : ''} on {logsDate}
                </td>
                <td className="px-5 py-3 text-right text-xs font-medium text-gray-700">
                  {(() => {
                    const total = logs.reduce((s, l) => s + (l.duration_minutes || 0), 0);
                    return total > 0 ? `${total} min total` : '—';
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', staff: 'bg-gray-100 text-gray-700' };
  const labels = { admin: 'Owner', manager: 'Manager', staff: 'Staff' };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[role] || colors.staff}`}>{labels[role] || role}</span>;
}
