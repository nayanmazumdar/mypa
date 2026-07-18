import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendarDays,
  HiOutlineUserGroup,
  HiOutlineBuildingStorefront,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineFunnel,
  HiOutlineArrowPath,
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

export default function AdminAttendance() {
  usePageTitle('Attendance');
  const { user } = useSelector((s) => s.auth);

  const [loading,   setLoading]   = useState(true);
  const [shops,     setShops]     = useState([]);
  const [records,   setRecords]   = useState([]);
  const [todaySnap, setTodaySnap] = useState([]); // today snapshot per shop
  const [filters,   setFilters]   = useState({
    shop_id:   '',
    date_from: today(),
    date_to:   today(),
  });
  const [mode, setMode] = useState('today'); // 'today' | 'range'

  // Load shops owned by this admin
  const loadShops = useCallback(async () => {
    try {
      const res = await api.get('/admin/shops');
      setShops(res.data || []);
      // Auto-select first shop
      if (res.data?.length) {
        setFilters(f => ({ ...f, shop_id: String(res.data[0].id) }));
      }
    } catch {
      toast.error('Failed to load shops');
    }
  }, []);

  // Load today's snapshot (all shops or single shop)
  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const params = filters.shop_id ? { shop_id: filters.shop_id } : {};
      const res = await api.get('/attendance/admin', { params });
      // Response is array of { date, shop_name, records: [...] } when no shop_id
      // or flat array of records when shop_id provided without date
      if (Array.isArray(res.data) && res.data[0]?.records) {
        setTodaySnap(res.data);
        setRecords([]);
      } else {
        setRecords(res.data || []);
        setTodaySnap([]);
      }
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [filters.shop_id]);

  // Load range records
  const loadRange = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(filters.shop_id  && { shop_id:   filters.shop_id }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to   && { date_to:   filters.date_to }),
      };
      const res = await api.get('/attendance/admin', { params });
      setRecords(res.data || []);
      setTodaySnap([]);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadShops(); }, [loadShops]);

  useEffect(() => {
    if (mode === 'today') loadToday();
    else loadRange();
  }, [mode, loadToday, loadRange]);

  const refresh = () => {
    if (mode === 'today') loadToday();
    else loadRange();
  };

  // ── Stats helpers ──────────────────────────────────────────
  const flatRecords = todaySnap.length
    ? todaySnap.flatMap(s => s.records)
    : records;

  const present  = flatRecords.filter(r => r.check_in).length;
  const absent   = flatRecords.filter(r => !r.check_in).length;
  const checkedOut = flatRecords.filter(r => r.check_in && r.check_out).length;

  const selectedShopName = shops.find(s => String(s.id) === filters.shop_id)?.name || 'All Shops';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineCalendarDays className="w-6 h-6 text-primary-600" />
            Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track staff check-in / check-out across your shops.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors self-start sm:self-auto"
          style={NEO.card}
        >
          <HiOutlineArrowPath className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl p-4 space-y-3" style={NEO.raised}>
        <div className="flex items-center gap-2 mb-1">
          <HiOutlineFunnel className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden" style={NEO.inset}>
            {[['today', 'Today'], ['range', 'Date Range']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setMode(val)}
                className={`px-4 py-2 text-xs font-semibold transition-all ${
                  mode === val
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Shop selector */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Shop</label>
            <select
              value={filters.shop_id}
              onChange={(e) => setFilters(f => ({ ...f, shop_id: e.target.value }))}
              className="input-field text-sm py-2 pr-8 min-w-[160px]"
            >
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date range (only in range mode) */}
          {mode === 'range' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">From</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                  className="input-field text-sm py-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">To</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                  className="input-field text-sm py-2"
                />
              </div>
              <button onClick={loadRange} className="btn-primary text-sm px-5 py-2 self-end">
                Apply
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats cards ── */}
      {flatRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<HiOutlineCheckCircle className="w-5 h-5 text-green-500" />}
            label="Present"
            value={present}
            color="text-green-600"
          />
          <StatCard
            icon={<HiOutlineClock className="w-5 h-5 text-blue-500" />}
            label="Checked Out"
            value={checkedOut}
            color="text-blue-600"
          />
          <StatCard
            icon={<HiOutlineXCircle className="w-5 h-5 text-red-400" />}
            label="Absent"
            value={absent}
            color="text-red-500"
          />
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <LoadingSpinner />
      ) : mode === 'today' && todaySnap.length > 0 ? (
        // Today snapshot — one section per shop
        <div className="space-y-6">
          {todaySnap.map((snap) => (
            <TodayShopSection key={snap.shop_name} snap={snap} />
          ))}
        </div>
      ) : flatRecords.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={NEO.raised}>
          <HiOutlineCalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No attendance records found</p>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'today' ? 'No check-ins recorded today yet.' : 'Try adjusting the date range.'}
          </p>
        </div>
      ) : (
        // Range / filtered records table
        <AttendanceTable records={records} showShop={!filters.shop_id || shops.length > 1} />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center gap-1" style={{
      background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff',
    }}>
      {icon}
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function TodayShopSection({ snap }) {
  const present    = snap.records.filter(r => r.check_in).length;
  const total      = snap.records.length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff',
    }}>
      {/* Shop header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200/50">
        <div className="flex items-center gap-2">
          <HiOutlineBuildingStorefront className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-gray-800 text-sm">{snap.shop_name}</span>
          <span className="text-xs text-gray-400">{snap.date}</span>
        </div>
        <span className="text-xs font-semibold text-primary-600">
          {present}/{total} present
        </span>
      </div>

      {snap.records.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">No staff assigned.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden divide-y divide-gray-100/50">
            {snap.records.map((r) => (
              <StaffRow key={r.user_id} r={r} />
            ))}
          </div>
          {/* Desktop */}
          <table className="hidden sm:table w-full text-sm">
            <thead style={{ background: 'rgba(200,207,216,0.15)' }}>
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Staff</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Role</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Check In</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Check Out</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {snap.records.map((r) => (
                <tr key={r.user_id} style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 text-xs font-semibold">{r.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{r.name}</p>
                        <p className="text-[10px] text-gray-400">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 capitalize">{r.role}{r.designation ? ` · ${r.designation}` : ''}</td>
                  <td className="px-5 py-3 text-sm">{r.check_in ? <Time t={r.check_in} /> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 text-sm">{r.check_out ? <Time t={r.check_out} /> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3"><StatusBadge r={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function StaffRow({ r }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
        <span className="text-primary-700 text-xs font-semibold">{r.name?.charAt(0)?.toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
        <p className="text-[10px] text-gray-400 capitalize">{r.role}</p>
      </div>
      <div className="text-right">
        {r.check_in ? (
          <>
            <p className="text-xs text-green-600 font-semibold"><Time t={r.check_in} /></p>
            {r.check_out && <p className="text-[10px] text-gray-400"><Time t={r.check_out} /></p>}
          </>
        ) : (
          <span className="text-[11px] text-red-400 font-medium">Absent</span>
        )}
      </div>
    </div>
  );
}

function AttendanceTable({ records, showShop }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff',
    }}>
      {/* Mobile */}
      <div className="sm:hidden divide-y divide-gray-100/50">
        {records.map((r, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-700 text-xs font-semibold">{r.staff_name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{r.staff_name}</p>
              <p className="text-[10px] text-gray-400">{r.date}{showShop && r.shop_name ? ` · ${r.shop_name}` : ''}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {r.check_in ? (
                <>
                  <p className="text-xs text-green-600 font-semibold"><Time t={r.check_in} /></p>
                  {r.check_out && <p className="text-[10px] text-gray-400"><Time t={r.check_out} /></p>}
                </>
              ) : (
                <span className="text-[11px] text-red-400">Absent</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Desktop */}
      <table className="hidden sm:table w-full text-sm">
        <thead style={{ background: 'rgba(200,207,216,0.2)' }}>
          <tr>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Staff</th>
            {showShop && <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Shop</th>}
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Check In</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Check Out</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
            <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Notes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(200,207,216,0.15)' }}>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-[11px] font-semibold">{r.staff_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{r.staff_name}</p>
                    <p className="text-[10px] text-gray-400">{r.staff_email}</p>
                  </div>
                </div>
              </td>
              {showShop && <td className="px-5 py-3.5 text-xs text-gray-500">{r.shop_name || '—'}</td>}
              <td className="px-5 py-3.5 text-xs text-gray-600 font-mono">{r.date}</td>
              <td className="px-5 py-3.5">{r.check_in  ? <Time t={r.check_in}  /> : <span className="text-gray-300">—</span>}</td>
              <td className="px-5 py-3.5">{r.check_out ? <Time t={r.check_out} /> : <span className="text-gray-300">—</span>}</td>
              <td className="px-5 py-3.5"><StatusBadge r={r} /></td>
              <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[140px] truncate">{r.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Time({ t }) {
  if (!t) return null;
  // t may be a full datetime string or HH:MM:SS
  const str = typeof t === 'string' ? t : String(t);
  const parts = str.includes('T') ? str.split('T')[1] : str;
  return <span className="font-mono text-gray-700">{parts.slice(0, 5)}</span>;
}

function StatusBadge({ r }) {
  if (!r.check_in) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">Absent</span>;
  }
  if (r.check_in && !r.check_out) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Present</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Completed</span>;
}
