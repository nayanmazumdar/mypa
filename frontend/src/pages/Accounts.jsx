import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineBanknotes, HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown, HiOutlineShoppingCart, HiOutlineReceiptPercent,
  HiOutlineArrowPath, HiOutlineChartBarSquare, HiOutlineCurrencyRupee,
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineCalendarDays,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import { posApi, expenseApi, reportApi } from '../api/pos.api';
import { purchaseApi } from '../api/purchase.api';
import Modal from '../components/common/Modal';

const fmt = (n) =>
  `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtCompact = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor, trend, border }) {
  return (
    <div className={`card p-5 flex flex-col gap-3 ${border ? `border-l-4 ${border}` : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className={`text-xs mt-1 ${subColor || 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

export default function Accounts() {
  const { user } = useSelector((s) => s.auth);

  // ── Selected date (defaults to today) ─────────────────────────
  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const [selectedDate, setSelectedDate] = useState(todayISO);

  const selectedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const isToday = selectedDate === todayISO;

  const shiftDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    setSelectedDate(s);
  };

  // today snapshot from new endpoint
  const [today, setToday] = useState(null);

  // existing data
  const [expenses, setExpenses]           = useState([]);
  const [expenseSummary, setExpenseSummary] = useState([]);
  const [transactions, setTransactions]   = useState([]);
  const [loading, setLoading]             = useState(true);

  // lazy-loaded POS transactions — overview card (8 rows, loads when overview first renders)
  const [overviewTxLoading, setOverviewTxLoading] = useState(false);
  const [overviewTxLoaded,  setOverviewTxLoaded]  = useState(false);
  const overviewTxInFlight = useRef(false); // ref guard to prevent double-fetch

  // lazy-loaded POS transactions — transactions tab (paginated, loads on first tab open)
  const [txPage, setTxPage]             = useState(1);
  const [txPagination, setTxPagination] = useState(null);
  const [txLoading, setTxLoading]       = useState(false);
  const [txLoaded, setTxLoaded]         = useState(false);

  // lazy-loaded purchases — purchases tab (loads on first tab open)
  const [tabPurchases, setTabPurchases]     = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesLoaded,  setPurchasesLoaded]  = useState(false);

  // ── expense print date range (defaults to selected date's full month) ──
  const [expPrintFrom, setExpPrintFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [expPrintTo, setExpPrintTo] = useState(new Date().toISOString().split('T')[0]);
  const [printing,   setPrinting]   = useState(false);
  const [showPrintRange, setShowPrintRange] = useState(false);
  const [printingSummary, setPrintingSummary] = useState(false);

  const printExpenses = async () => {
    setPrinting(true);
    try {
      const expRes = await expenseApi.getAll({ start_date: expPrintFrom, end_date: expPrintTo, limit: 1000 });

      const rows      = expRes.data || [];
      const grandTotal = rows.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

      // ── Payment method breakdown for expenses ──
      const expByPay   = {};
      const expByCnt   = {};
      rows.forEach(e => {
        const m = e.payment_method || 'cash';
        expByPay[m] = (expByPay[m] || 0) + parseFloat(e.amount || 0);
        expByCnt[m] = (expByCnt[m] || 0) + 1;
      });

      // ── Methods derived only from expense records ──
      const allMethods = Object.keys(expByPay);

      const shopName  = user?.shop_name || user?.name || 'Shop';
      const adminName = user?.name || '';
      const fmtDate   = (d) => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
      const fmtAmt    = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
      const fromLabel = fmtDate(expPrintFrom);
      const toLabel   = fmtDate(expPrintTo);

      // colour map per payment method
      const methodStyle = {
        cash:         { bg:'#dcfce7', color:'#15803d', label:'Cash' },
        upi:          { bg:'#ede9fe', color:'#7c3aed', label:'UPI' },
        card:         { bg:'#dbeafe', color:'#1d4ed8', label:'Card' },
        credit:       { bg:'#fee2e2', color:'#dc2626', label:'Udhaar' },
        bank_transfer:{ bg:'#fef9c3', color:'#854d0e', label:'Card Payment' },
      };
      const ms = (m) => methodStyle[m] || { bg:'#f3f4f6', color:'#374151', label: m.charAt(0).toUpperCase()+m.slice(1) };

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Expense Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1f2937;padding:24px;max-width:820px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px}
  .shop{font-size:18px;font-weight:700;color:#1f2937}.admin{font-size:12px;color:#6b7280;margin-top:3px}
  .rhs{text-align:right}
  .rhs-title{font-size:16px;font-weight:800;color:#dc2626;letter-spacing:-0.2px}
  .rhs-period{display:inline-block;margin-top:5px;background:#f1f5f9;color:#0f172a;font-weight:700;font-size:12px;padding:4px 12px;border-radius:999px;border:1.5px solid #334155;letter-spacing:0.01em}
  .rhs-generated{font-size:10px;color:#9ca3af;margin-top:5px}
  h1{font-size:17px;font-weight:700;margin-bottom:3px}
  h2{font-size:13px;font-weight:700;color:#374151;margin:20px 0 10px;padding-bottom:5px;border-bottom:1px solid #e5e7eb}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  thead tr{background:#f3f4f6}
  th{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb}
  th.right,td.right{text-align:right}
  td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
  tr:nth-child(even) td{background:#fafafa}
  .total-row td{background:#f3f4f6!important;border-top:2px solid #d1d5db;padding:9px 10px;font-weight:700;font-size:13px}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600}
  /* ── composite summary grid ── */
  .summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px}
  .sum-card{border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;background:#fff}
  .sum-card-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .sum-row{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px}
  .sum-row span:last-child{font-weight:600}
  .sum-divider{border:none;border-top:1px solid #e5e7eb;margin:6px 0}
  .sum-net{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:4px}
  .net-pos{color:#15803d}.net-neg{color:#dc2626}
  /* ── totals strip ── */
  .totals-strip{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .tot{flex:1;min-width:130px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px}
  .tot-label{font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
  .tot-value{font-size:18px;font-weight:800;color:#1f2937}
  .tot-sub{font-size:10px;color:#9ca3af;margin-top:2px}
  .footer{margin-top:24px;border-top:2px solid #e5e7eb;padding-top:14px;display:flex;align-items:center;justify-content:space-between}
  .footer-brand{display:flex;align-items:center;gap:10px}
  .footer-logo{width:32px;height:32px;object-fit:contain;border-radius:6px}
  .footer-name{font-size:15px;font-weight:700;color:#1f2937;letter-spacing:-0.3px}
  .footer-tag{font-size:10px;color:#6b7280;margin-top:1px}
  .footer-meta{text-align:right;font-size:10px;color:#9ca3af;line-height:1.6}
  @media print{body{padding:14px}tr{page-break-inside:avoid}.summary-grid{grid-template-columns:repeat(3,1fr)}}
</style></head><body>

<div class="header">
  <div><div class="shop">${shopName}</div><div class="admin">${adminName}</div></div>
  <div class="rhs">
    <div class="rhs-title">Expense Report</div>
    <div class="rhs-period">${fromLabel} — ${toLabel}</div>
    <div class="rhs-generated">Generated: ${new Date().toLocaleString('en-GB')}</div>
  </div>
</div>

<!-- ── Totals strip ── -->
<div style="display:flex;justify-content:flex-end;margin-bottom:20px">
  <div class="tot" style="min-width:180px;max-width:220px">
    <div class="tot-label">Total Expenses</div>
    <div class="tot-value" style="color:#dc2626">${fmtAmt(grandTotal)}</div>
    <div class="tot-sub">${rows.length} entr${rows.length !== 1 ? 'ies' : 'y'}</div>
  </div>
</div>

<!-- ── Expense Method Summary ── -->
<h2>Expense Breakdown — ${toLabel.slice(3)}</h2>
<div class="summary-grid">
  ${allMethods.map(m => {
    const { bg, color, label } = ms(m);
    const exp = parseFloat(expByPay[m] || 0);
    const cnt = Number(expByCnt[m] || 0);
    return `<div class="sum-card">
      <div class="sum-card-label" style="color:${color}">${label}</div>
      <hr class="sum-divider"/>
      <div class="sum-row"><span>Amount</span><span style="color:#dc2626;font-size:13px;font-weight:700">${fmtAmt(exp)}</span></div>
      <div class="sum-row"><span style="color:#9ca3af;font-size:10px">${cnt} entr${cnt !== 1 ? 'ies' : 'y'}</span></div>
    </div>`;
  }).join('')}
</div>

<!-- ── Expense detail table ── -->
<h2>Expense Details</h2>
<table>
  <thead><tr>
    <th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Payment</th><th class="right">Amount</th>
  </tr></thead>
  <tbody>
    ${rows.map((e, i) => {
      const { bg, color } = ms(e.payment_method || 'cash');
      return `<tr>
        <td style="color:#9ca3af;font-size:11px">${i+1}</td>
        <td>${fmtDate(e.expense_date)}</td>
        <td style="font-weight:600">${e.category || '—'}</td>
        <td style="color:#6b7280">${e.description || '—'}</td>
        <td><span class="badge" style="background:${bg};color:${color}">${(e.payment_method||'cash').toUpperCase()}</span></td>
        <td class="right" style="font-weight:700;color:#dc2626">${fmtAmt(e.amount)}</td>
      </tr>`;
    }).join('')}
    <tr class="total-row">
      <td colspan="5" style="color:#374151">Total (${rows.length} entries)</td>
      <td class="right" style="color:#dc2626;font-size:15px">${fmtAmt(grandTotal)}</td>
    </tr>
  </tbody>
</table>

<div class="footer">
  <div class="footer-brand">
    <img class="footer-logo" src="${window.location.origin}/logo.png" alt="myPA logo" />
    <div>
      <div class="footer-name">myPA</div>
      <div class="footer-tag">Smart Shop Management</div>
    </div>
  </div>
  <div class="footer-meta">
    <div>Expense Report &bull; ${fromLabel} to ${toLabel}</div>
    <div>Generated: ${new Date().toLocaleString('en-GB')}</div>
  </div>
</div>
</body></html>`;

      const w = window.open('', '_blank', 'width=960,height=750');
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 400);
    } catch {
      toast.error('Failed to generate expense report');
    } finally {
      setPrinting(false);
    }
  };

  // ── Print Daily Summary (composite report for selected date) ──
  const printSummary = async () => {
    setPrintingSummary(true);
    try {
      const date = selectedDate;
      const [txRes, purchRes, expRes, posRes] = await Promise.all([
        posApi.getTransactions({ date, limit: 1000, page: 1 }),
        purchaseApi.getAll({ start_date: date, end_date: date, limit: 1000 }),
        expenseApi.getAll({ start_date: date, end_date: date, limit: 1000 }),
        posApi.getTodaySummary({ date }),
      ]);

      const txRows     = txRes?.data   || [];
      const purRows    = purchRes?.data || [];
      const expRows    = expRes?.data  || [];
      const posSummary = posRes?.data  || {};

      const shopName  = user?.shop_name || user?.name || 'Shop';
      const adminName = user?.name || '';
      const logoUrl   = `${window.location.origin}/logo.png`;
      const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      });

      const fmtAmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // Totals
      const posRevenue  = parseFloat(posSummary.total_revenue || 0);
      const posTxCount  = Number(posSummary.total_transactions || 0);
      const pb          = posSummary.payment_breakdown || { cash: 0, upi: 0, card: 0, credit: 0 };
      const pc          = posSummary.payment_counts    || { cash: 0, upi: 0, card: 0, credit: 0 };
      const purTotal    = purRows.reduce((s, p) => s + parseFloat(p.net_amount  || 0), 0);
      const purPaid     = purRows.reduce((s, p) => s + parseFloat(p.paid_amount || 0), 0);
      const purDue      = purRows.reduce((s, p) => s + parseFloat(p.due_amount  || 0), 0);
      const expTotal    = expRows.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const netCashFlow = posRevenue - purTotal - expTotal;

      const methodStyle = {
        cash:         { bg: '#dcfce7', color: '#15803d', label: 'Cash' },
        upi:          { bg: '#ede9fe', color: '#7c3aed', label: 'UPI' },
        card:         { bg: '#dbeafe', color: '#1d4ed8', label: 'Card' },
        credit:       { bg: '#fee2e2', color: '#dc2626', label: 'Udhaar' },
        bank_transfer:{ bg: '#fef9c3', color: '#854d0e', label: 'Card Payment' },
      };
      const ms = (m) => methodStyle[m] || { bg: '#f3f4f6', color: '#374151', label: (m||'cash').charAt(0).toUpperCase()+(m||'cash').slice(1) };

      const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>Daily Summary — ${dateLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1f2937;padding:28px;max-width:900px;margin:0 auto;background:#fff}

  /* ── Header ── */
  .report-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7c3aed;padding-bottom:14px;margin-bottom:18px}
  .shop-name{font-size:22px;font-weight:800;color:#1f2937;letter-spacing:-0.3px}
  .shop-admin{font-size:12px;color:#6b7280;margin-top:3px}
  .report-meta{text-align:right}
  .report-title{font-size:15px;font-weight:700;color:#7c3aed}
  .report-date{display:inline-block;margin-top:6px;background:#f1f5f9;color:#0f172a;font-weight:700;font-size:12px;padding:4px 12px;border-radius:999px;border:1.5px solid #334155;letter-spacing:0.01em}
  .report-generated{font-size:10px;color:#d1d5db;margin-top:5px}

  /* ── Section headings ── */
  h2{font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid #e5e7eb;display:flex;align-items:center;gap:6px}
  h2 .dot{display:inline-block;width:8px;height:8px;border-radius:50%}

  /* ── KPI strip ── */
  .kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .kpi{border-radius:10px;padding:14px 16px;border:1px solid #e5e7eb}
  .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:6px}
  .kpi-value{font-size:22px;font-weight:800;line-height:1.1}
  .kpi-sub{font-size:10px;color:#9ca3af;margin-top:4px}

  /* ── Payment method row ── */
  .pay-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .pay-card{border-radius:8px;padding:10px 12px;border:1px solid #e5e7eb;text-align:center}
  .pay-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
  .pay-amt{font-size:16px;font-weight:800}
  .pay-cnt{font-size:10px;color:#9ca3af;margin-top:2px}

  /* ── Tables ── */
  table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:12px}
  thead tr{background:#f8fafc}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb}
  th.r,td.r{text-align:right}
  td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
  tr:hover td{background:#fafafa}
  .tfoot-row td{background:#f3f4f6!important;border-top:2px solid #d1d5db;font-weight:700;font-size:12px;padding:9px 10px}
  .badge{display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600}
  .empty{color:#9ca3af;font-style:italic;padding:14px 10px;text-align:center}

  /* ── Net cash flow banner ── */
  .net-banner{border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .net-banner .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  .net-banner .val{font-size:26px;font-weight:800}
  .net-banner .sub{font-size:11px;margin-top:3px;opacity:.8}

  /* ── Signature ── */
  .signature-section{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;padding-top:16px;border-top:1px dashed #e5e7eb}
  .sig-left{font-size:10px;color:#9ca3af;line-height:1.7}
  .sig-box{text-align:center;width:200px}
  .sig-line{border-top:1.5px solid #374151;margin-bottom:6px}
  .sig-name{font-size:13px;font-weight:700;color:#111}
  .sig-title{font-size:11px;color:#6b7280;margin-top:2px}
  .sig-date{font-size:11px;color:#9ca3af;margin-top:3px}

  /* ── Footer ── */
  .footer{margin-top:20px;border-top:2px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center}
  .footer-brand{display:flex;align-items:center;gap:10px}
  .footer-brand img{height:36px;width:36px;object-fit:contain;border-radius:8px}
  .brand-name{font-size:16px;font-weight:800;color:#7c3aed;letter-spacing:-0.3px}
  .brand-tagline{font-size:10px;color:#9b7fd4;margin-top:1px}
  .footer-meta{text-align:right;font-size:10px;color:#9ca3af;line-height:1.7}
  .cgr{text-align:center;font-size:10px;color:#d1d5db;margin-top:10px;font-style:italic}

  @media print{
    body{padding:16px}
    tr{page-break-inside:avoid}
    h2{page-break-after:avoid}
    .kpi-strip,.pay-row{page-break-inside:avoid}
    @page{margin:10mm;size:A4}
  }
</style>
</head><body>

<!-- ── Report header ── -->
<div class="report-header">
  <div>
    <div class="shop-name">${shopName}</div>
    <div class="shop-admin">${adminName}</div>
  </div>
  <div class="report-meta">
    <div class="report-title">📋 Daily Summary Report</div>
    <div class="report-date">${dateLabel}</div>
    <div class="report-generated">Generated: ${new Date().toLocaleString('en-IN')}</div>
  </div>
</div>

<!-- ── KPI strip ── -->
<div class="kpi-strip">
  <div class="kpi" style="background:#f0fdf4;border-color:#bbf7d0">
    <div class="kpi-label">POS Sales</div>
    <div class="kpi-value" style="color:#15803d">${fmtAmt(posRevenue)}</div>
    <div class="kpi-sub">${posTxCount} transaction${posTxCount !== 1 ? 's' : ''}</div>
  </div>
  <div class="kpi" style="background:#f5f3ff;border-color:#ddd6fe">
    <div class="kpi-label">Purchases</div>
    <div class="kpi-value" style="color:#7c3aed">${fmtAmt(purTotal)}</div>
    <div class="kpi-sub">${purRows.length} order${purRows.length !== 1 ? 's' : ''}${purDue > 0 ? ` · ${fmtAmt(purDue)} due` : ' · fully paid'}</div>
  </div>
  <div class="kpi" style="background:#fff1f2;border-color:#fecdd3">
    <div class="kpi-label">Expenses</div>
    <div class="kpi-value" style="color:#dc2626">${fmtAmt(expTotal)}</div>
    <div class="kpi-sub">${expRows.length} entr${expRows.length !== 1 ? 'ies' : 'y'}</div>
  </div>
  <div class="kpi" style="background:${netCashFlow >= 0 ? '#f0fdf4' : '#fff7ed'};border-color:${netCashFlow >= 0 ? '#bbf7d0' : '#fed7aa'}">
    <div class="kpi-label">Net Cash Flow</div>
    <div class="kpi-value" style="color:${netCashFlow >= 0 ? '#15803d' : '#ea580c'}">${netCashFlow >= 0 ? '+' : '-'}${fmtAmt(Math.abs(netCashFlow))}</div>
    <div class="kpi-sub" style="color:${netCashFlow >= 0 ? '#16a34a' : '#f97316'}">${netCashFlow >= 0 ? '▲ Surplus' : '▼ Deficit'}</div>
  </div>
</div>

<!-- ── Net cash flow banner ── -->
<div class="net-banner" style="background:${netCashFlow >= 0 ? '#f0fdf4' : '#fff7ed'};border:1.5px solid ${netCashFlow >= 0 ? '#bbf7d0' : '#fed7aa'}">
  <div>
    <div class="lbl" style="color:${netCashFlow >= 0 ? '#15803d' : '#ea580c'}">Net Cash Flow for ${dateLabel}</div>
    <div class="sub" style="color:${netCashFlow >= 0 ? '#16a34a' : '#f97316'}">${netCashFlow >= 0 ? 'Surplus — earnings exceeded spending' : 'Deficit — spending exceeded earnings'}</div>
  </div>
  <div class="val" style="color:#0f172a">${netCashFlow >= 0 ? '+' : '-'}${fmtAmt(Math.abs(netCashFlow))}</div>
</div>

<!-- ── Payment method breakdown ── -->
<h2><span class="dot" style="background:#7c3aed"></span>POS / Sales Payment Method Breakdown</h2>
<div class="pay-row">
  ${['cash','upi','card','credit'].map(m => {
    const { bg, color, label } = ms(m);
    return `<div class="pay-card" style="background:${bg};border-color:${color}22">
      <div class="pay-label" style="color:${color}">${label}</div>
      <div class="pay-amt" style="color:${color}">${fmtAmt(pb[m] || 0)}</div>
      <div class="pay-cnt">${pc[m] || 0} txns</div>
    </div>`;
  }).join('')}
</div>

<!-- ── POS Transactions ── -->
<h2><span class="dot" style="background:#15803d"></span>POS Transactions (${txRows.length})</h2>
${txRows.length === 0 ? '<p class="empty">No POS transactions recorded for this date</p>' : `
<table>
  <thead><tr>
    <th>#</th><th>Receipt</th><th>Customer</th><th class="r">Amount</th><th>Payment</th><th>Time</th>
  </tr></thead>
  <tbody>
    ${txRows.map((tx, i) => {
      const { bg, color } = ms(tx.payment_method || 'cash');
      return `<tr>
        <td style="color:#9ca3af;font-size:11px">${i+1}</td>
        <td style="font-family:monospace;font-weight:600;color:#7c3aed;font-size:11px">${tx.receipt_number || '—'}</td>
        <td>${tx.customer_name || 'Walk-in'}</td>
        <td class="r" style="font-weight:700;color:#15803d">${fmtAmt(tx.net_amount)}</td>
        <td><span class="badge" style="background:${bg};color:${color}">${(tx.payment_method||'cash').toUpperCase()}</span></td>
        <td style="color:#9ca3af;font-size:11px">${new Date(tx.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot><tr class="tfoot-row">
    <td colspan="3" style="color:#374151">Total (${txRows.length} transactions)</td>
    <td class="r" style="color:#15803d;font-size:14px">${fmtAmt(posRevenue)}</td>
    <td colspan="2"></td>
  </tr></tfoot>
</table>`}

<!-- ── Purchases ── -->
<h2><span class="dot" style="background:#7c3aed"></span>Purchases (${purRows.length})</h2>
${purRows.length === 0 ? '<p class="empty">No purchases recorded for this date</p>' : `
<table>
  <thead><tr>
    <th>#</th><th>Invoice</th><th>Supplier</th><th class="r">Total</th><th class="r">Paid</th><th class="r">Due</th><th>Status</th>
  </tr></thead>
  <tbody>
    ${purRows.map((p, i) => {
      const due = parseFloat(p.due_amount || 0);
      const statusColors = { paid:'#dcfce7|#15803d', partial:'#fef9c3|#854d0e', unpaid:'#fee2e2|#dc2626', received:'#dbeafe|#1d4ed8', ordered:'#f3f4f6|#374151' };
      const [sbg, scolor] = (statusColors[p.payment_status] || statusColors[p.status] || '#f3f4f6|#374151').split('|');
      return `<tr>
        <td style="color:#9ca3af;font-size:11px">${i+1}</td>
        <td style="font-family:monospace;font-weight:600;color:#7c3aed;font-size:11px">${p.invoice_number || '—'}</td>
        <td>${p.supplier_name || '—'}</td>
        <td class="r" style="font-weight:600">${fmtAmt(p.net_amount)}</td>
        <td class="r" style="color:#15803d;font-weight:600">${fmtAmt(p.paid_amount)}</td>
        <td class="r" style="color:${due > 0 ? '#dc2626' : '#9ca3af'};font-weight:${due > 0 ? '600' : '400'}">${due > 0 ? fmtAmt(due) : '—'}</td>
        <td><span class="badge" style="background:${sbg};color:${scolor}">${(p.payment_status||p.status||'—').toUpperCase()}</span></td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot><tr class="tfoot-row">
    <td colspan="3" style="color:#374151">Total (${purRows.length} orders)</td>
    <td class="r">${fmtAmt(purTotal)}</td>
    <td class="r" style="color:#15803d">${fmtAmt(purPaid)}</td>
    <td class="r" style="color:${purDue > 0 ? '#dc2626' : '#9ca3af'}">${purDue > 0 ? fmtAmt(purDue) : '—'}</td>
    <td></td>
  </tr></tfoot>
</table>`}

<!-- ── Expenses ── -->
<h2><span class="dot" style="background:#dc2626"></span>Expenses (${expRows.length})</h2>
${expRows.length === 0 ? '<p class="empty">No expenses recorded for this date</p>' : `
<table>
  <thead><tr>
    <th>#</th><th>Category</th><th>Description</th><th class="r">Amount</th><th>Payment</th>
  </tr></thead>
  <tbody>
    ${expRows.map((e, i) => {
      const { bg, color } = ms(e.payment_method || 'cash');
      return `<tr>
        <td style="color:#9ca3af;font-size:11px">${i+1}</td>
        <td style="font-weight:600">${e.category || '—'}</td>
        <td style="color:#6b7280">${e.description || '—'}</td>
        <td class="r" style="font-weight:700;color:#dc2626">${fmtAmt(e.amount)}</td>
        <td><span class="badge" style="background:${bg};color:${color}">${(e.payment_method||'cash').toUpperCase()}</span></td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot><tr class="tfoot-row">
    <td colspan="3" style="color:#374151">Total (${expRows.length} entries)</td>
    <td class="r" style="color:#dc2626;font-size:14px">${fmtAmt(expTotal)}</td>
    <td></td>
  </tr></tfoot>
</table>`}

<!-- ── Signature & Footer ── -->
<div class="signature-section">
  <div class="sig-left">
    <div>💻 Computer Generated Report</div>
    <div>Does not require manual signature</div>
  </div>
  <div class="sig-box">
    <div style="height:48px"></div>
    <div class="sig-line"></div>
    <div class="sig-name">${adminName}</div>
    <div class="sig-title">Business Administrator</div>
    <div class="sig-date">Date: ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
  </div>
</div>

<div class="footer">
  <div class="footer-brand">
    <img src="${logoUrl}" alt="myPA logo" onerror="this.style.display='none'" />
    <div>
      <div class="brand-name">myPA</div>
      <div class="brand-tagline">Smart Shop Management</div>
    </div>
  </div>
  <div class="footer-meta">
    <div>Daily Summary · ${dateLabel}</div>
    <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
  </div>
</div>
<div class="cgr">System generated report — myPA Smart Shop Management</div>

</body></html>`;

      const w = window.open('', '_blank', 'width=980,height=800');
      if (!w) { toast.error('Pop-up blocked — allow pop-ups to print'); return; }
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    } catch (err) {
      console.error('printSummary error:', err);
      toast.error('Failed to generate summary report');
    } finally {
      setPrintingSummary(false);
    }
  };

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '', description: '', amount: '',
    payment_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
  });
  const [activeTab, setActiveTab] = useState('overview');

  // ── Lazy-load purchases — purchases tab ───────────────────
  const loadTabPurchases = useCallback(async (date) => {
    setPurchasesLoading(true);
    try {
      const res = await purchaseApi.getAll({ start_date: date, end_date: date, limit: 1000 });
      setTabPurchases(res.data || []);
      setPurchasesLoaded(true);
    } catch (err) {
      console.error('loadTabPurchases error:', err);
      toast.error('Failed to load purchases');
    } finally {
      setPurchasesLoading(false);
    }
  }, []);

  // ── Lazy-load POS transactions — overview card (8 rows) ────
  const loadOverviewTransactions = useCallback(async (date) => {
    if (overviewTxInFlight.current) return;   // already in-flight, skip
    overviewTxInFlight.current = true;
    setOverviewTxLoading(true);
    try {
      const res = await posApi.getTransactions({ page: 1, limit: 8, date });
      setTransactions(res.data || []);
      setOverviewTxLoaded(true);
    } catch (err) {
      const status = err?.response?.status;
      console.error('loadOverviewTransactions error:', status, err?.structured || err?.message || err);
      if (status !== 401) toast.error('Failed to load recent transactions');
    } finally {
      overviewTxInFlight.current = false;
      setOverviewTxLoading(false);
    }
  }, []);

  // ── Lazy-load POS transactions — transactions tab (paginated) ─
  const loadTransactions = useCallback(async (pg = 1, date) => {
    setTxLoading(true);
    try {
      const res = await posApi.getTransactions({ page: pg, limit: 20, date });
      setTransactions(res.data || []);
      setTxPagination(res.pagination || null);
      setTxLoaded(true);
    } catch (err) {
      const status = err?.response?.status;
      console.error('loadTransactions error:', status, err?.structured || err?.message || err);
      if (status !== 401) toast.error(`Failed to load transactions: ${err?.structured?.message || err?.message || 'unknown'}`);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadData = useCallback(async (date) => {
    setLoading(true);
    const [
      posSummaryRes,   // POS revenue + payment breakdown for the date
      dailySalesRes,   // invoice sales for the date
      purchasesRes,    // purchases for the date
      expensesRes,     // expenses for the date
      expSummaryRes,   // expense category breakdown for the date's month
    ] = await Promise.allSettled([
      posApi.getTodaySummary({ date }),
      reportApi.getDailySales(date),
      purchaseApi.getAll({ start_date: date, end_date: date, limit: 1000 }),
      expenseApi.getAll({ start_date: date, end_date: date, limit: 1000 }),
      expenseApi.getSummary({ start_date: date.slice(0, 7) + '-01', end_date: date }),
    ]);

    // ── purchases ──
    const allPurchases = purchasesRes.status === 'fulfilled'
      ? (purchasesRes.value?.data || [])
      : [];
    const purchaseTotal = allPurchases.reduce((s, p) => s + parseFloat(p.net_amount  || 0), 0);
    const purchasePaid  = allPurchases.reduce((s, p) => s + parseFloat(p.paid_amount || 0), 0);
    const purchaseDue   = allPurchases.reduce((s, p) => s + parseFloat(p.due_amount  || 0), 0);

    // ── expenses list ──
    const expList = expensesRes.status === 'fulfilled'
      ? (expensesRes.value?.data || [])
      : [];
    setExpenses(expList);

    // ── expense summary ──
    if (expSummaryRes.status === 'fulfilled')
      setExpenseSummary(expSummaryRes.value?.data || []);

    // ── expenses total ──
    const expTotal = expList.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    // ── sales: invoice + POS ──
    const invoiceRevenue = dailySalesRes.status === 'fulfilled'
      ? parseFloat(dailySalesRes.value?.data?.total_revenue || 0)
      : 0;
    const invoiceCount = dailySalesRes.status === 'fulfilled'
      ? Number(dailySalesRes.value?.data?.total_sales || 0)
      : 0;
    const posSummary = posSummaryRes.status === 'fulfilled'
      ? (posSummaryRes.value?.data || {})
      : {};
    const posRevenue = parseFloat(posSummary.total_revenue || 0);
    const posCount   = Number(posSummary.total_transactions || 0);
    const paymentBreakdown = posSummary.payment_breakdown || { cash: 0, upi: 0, card: 0, credit: 0 };
    const paymentCounts    = posSummary.payment_counts    || { cash: 0, upi: 0, card: 0, credit: 0 };

    const totalRevenue = invoiceRevenue + posRevenue;
    const netCashFlow  = totalRevenue - purchaseTotal - expTotal;

    setToday({
      date,
      sales: {
        count:           invoiceCount + posCount,
        revenue:         totalRevenue,
        invoice_count:   invoiceCount,
        invoice_revenue: invoiceRevenue,
        pos_count:       posCount,
        pos_revenue:     posRevenue,
        payment_breakdown: paymentBreakdown,
        payment_counts:    paymentCounts,
      },
      purchases: {
        count: allPurchases.length,
        total: purchaseTotal,
        paid:  purchasePaid,
        due:   purchaseDue,
      },
      expenses: {
        count: expList.length,
        total: expTotal,
      },
      net_cash_flow: netCashFlow,
    });

    setLoading(false);
  }, []);

  // Re-fetch everything when selected date changes
  useEffect(() => {
    loadData(selectedDate);
    // Sync print range to selected month
    const firstOfSelectedMonth = selectedDate.slice(0, 7) + '-01';
    setExpPrintFrom(firstOfSelectedMonth);
    setExpPrintTo(selectedDate);
    // Reset lazy-load flags so overview card and transactions tab re-fetch for new date
    overviewTxInFlight.current = false;
    setOverviewTxLoaded(false);
    setTxLoaded(false);
    setTxPage(1);
    setTransactions([]);
    setTxPagination(null);
    setPurchasesLoaded(false);
    setTabPurchases([]);
  }, [selectedDate, loadData]);

  // Lazy-load overview card transactions on first overview render (or after date change)
  useEffect(() => {
    if (activeTab === 'overview' && !overviewTxLoaded) {
      loadOverviewTransactions(selectedDate);
    }
  }, [activeTab, overviewTxLoaded, loadOverviewTransactions, selectedDate]);

  // Lazy-load transactions tab on first activation (or after date change)
  useEffect(() => {
    if (activeTab === 'transactions' && !txLoaded) {
      loadTransactions(1, selectedDate);
    }
  }, [activeTab, txLoaded, loadTransactions, selectedDate]);

  // Lazy-load purchases tab on first activation (or after date change)
  useEffect(() => {
    if (activeTab === 'purchases' && !purchasesLoaded) {
      loadTabPurchases(selectedDate);
    }
  }, [activeTab, purchasesLoaded, loadTabPurchases, selectedDate]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await expenseApi.create({ ...expenseForm, amount: parseFloat(expenseForm.amount) });
      toast.success('Expense recorded');
      setShowExpenseModal(false);
      setExpenseForm({ category: '', description: '', amount: '', payment_method: 'cash', expense_date: new Date().toISOString().split('T')[0] });
      loadData(selectedDate);
    } catch {
      toast.error('Failed to record expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseApi.delete(id);
      toast.success('Expense deleted');
      loadData(selectedDate);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const expenseCategories = [
    'Rent', 'Electricity', 'Staff Salary', 'Transport',
    'Packaging', 'Maintenance', 'Wastage', 'Other',
  ];

  // derived
  const t = today || {};
  const sales     = t.sales     || {};
  const purchases = t.purchases || {};
  const exp       = t.expenses  || {};
  const netCash   = t.net_cash_flow ?? 0;

  const TABS = ['overview', 'transactions', 'purchases'];

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          {/* Date navigator */}
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Previous day"
            >
              ‹
            </button>
            <div className="relative flex items-center">
              <HiOutlineCalendarDays className="absolute left-2.5 w-4 h-4 text-primary-500 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                max={todayISO}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="pl-8 pr-3 py-1 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <button
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Next day"
            >
              ›
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayISO)}
                className="ml-1 px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-0.5">{selectedDateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printSummary}
            disabled={printingSummary || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 shadow-md ring-2 ring-violet-200 transition-colors"
            title={`Print daily summary for ${selectedDateLabel}`}
          >
            {printingSummary
              ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
              : <HiOutlinePrinter className="w-4 h-4" />
            }
            {printingSummary ? 'Preparing…' : 'Print Summary'}
          </button>
          <button
            onClick={() => loadData(selectedDate)}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            title="Refresh"
          >
            <HiOutlineArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Today's Snapshot Cards ────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {isToday ? "Today's Snapshot" : `Snapshot — ${selectedDateLabel}`}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Sales — today's POS only */}
          <StatCard
            icon={HiOutlineArrowTrendingUp}
            iconBg="bg-green-100" iconColor="text-green-600"
            border="border-green-400"
            label="Total Sales"
            value={fmtCompact(sales.pos_revenue)}
            sub={`${sales.pos_count ?? 0} POS transaction${sales.pos_count !== 1 ? 's' : ''}`}
          />

          {/* Total Purchases */}
          <StatCard
            icon={HiOutlineShoppingCart}
            iconBg="bg-violet-100" iconColor="text-violet-600"
            border="border-violet-400"
            label="Total Purchases"
            value={fmtCompact(purchases.total)}
            sub={purchases.due > 0
              ? `${fmt(purchases.due)} due`
              : `${purchases.count ?? 0} order${purchases.count !== 1 ? 's' : ''} · fully paid`}
            subColor={purchases.due > 0 ? 'text-red-500' : 'text-green-500'}
          />

          {/* Total Expenses */}
          <StatCard
            icon={HiOutlineArrowTrendingDown}
            iconBg="bg-red-100" iconColor="text-red-500"
            border="border-red-400"
            label="Total Expenses"
            value={fmtCompact(exp.total ?? 0)}
            sub={`${exp.count ?? 0} entr${(exp.count ?? 0) !== 1 ? 'ies' : 'y'}`}
          />

          {/* Net Cash Flow */}
          <StatCard
            icon={netCash >= 0 ? HiOutlineCheckCircle : HiOutlineExclamationCircle}
            iconBg={netCash >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}
            iconColor={netCash >= 0 ? 'text-emerald-600' : 'text-orange-500'}
            border={netCash >= 0 ? 'border-emerald-400' : 'border-orange-400'}
            label="Net Cash Flow"
            value={fmtCompact(Math.abs(netCash))}
            sub={netCash >= 0 ? 'Positive — surplus today' : 'Negative — more spent than earned'}
            subColor={netCash >= 0 ? 'text-emerald-500' : 'text-orange-500'}
          />
        </div>
      </div>

      {/* ── Secondary Cards ───────────────────────────────────── */}
      {(() => {
        const pb = sales.payment_breakdown || { cash: 0, upi: 0, card: 0, credit: 0 };
        const pc = sales.payment_counts    || { cash: 0, upi: 0, card: 0, credit: 0 };
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card p-4 text-center border-l-4 border-green-400">
              <HiOutlineBanknotes className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase tracking-wide">Cash</p>
              <p className="text-lg font-bold text-green-700">{fmtCompact(pb.cash)}</p>
              <p className="text-xs text-gray-400">{pc.cash} txns</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-purple-400">
              <HiOutlineCurrencyRupee className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase tracking-wide">UPI</p>
              <p className="text-lg font-bold text-purple-700">{fmtCompact(pb.upi)}</p>
              <p className="text-xs text-gray-400">{pc.upi} txns</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-blue-400">
              <HiOutlineReceiptPercent className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase tracking-wide">Card</p>
              <p className="text-lg font-bold text-blue-700">{fmtCompact(pb.card)}</p>
              <p className="text-xs text-gray-400">{pc.card} txns</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-red-400">
              <HiOutlineChartBarSquare className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase tracking-wide">Udhaar</p>
              <p className="text-lg font-bold text-red-600">{fmtCompact(pb.credit)}</p>
              <p className="text-xs text-gray-400">{pc.credit} txns</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-teal-400">
              <HiOutlineCurrencyRupee className="w-5 h-5 text-teal-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase tracking-wide">Purchase Paid</p>
              <p className="text-lg font-bold text-gray-800">{fmtCompact(purchases.paid)}</p>
              <p className="text-xs text-gray-400">{purchases.count ?? 0} orders</p>
            </div>
            <div className="card p-4 text-center border-l-4 border-amber-400">
              <HiOutlineArrowTrendingDown className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-0.5 font-semibold uppercase tracking-wide">Purchase Due</p>
              <p className={`text-lg font-bold ${parseFloat(purchases.due) > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                {fmtCompact(purchases.due)}
              </p>
              <p className="text-xs text-gray-400">outstanding</p>
            </div>
          </div>
        );
      })()}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Expense breakdown */}
          <div className="card">
            {/* Card header */}
            <div className="flex items-start justify-between gap-2 mb-4">
              <h3 className="font-semibold text-gray-900">
                Expense Breakdown — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setShowPrintRange((v) => !v)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 border border-primary-700 rounded-lg hover:bg-primary-700 shadow-sm transition-colors ring-2 ring-primary-200"
                title="Print expense report"
              >
                <HiOutlinePrinter className="w-3.5 h-3.5" />
                Print
              </button>
            </div>

            {/* Print date-range panel */}
            {showPrintRange && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">From</label>
                  <input
                    type="date"
                    value={expPrintFrom}
                    onChange={(e) => setExpPrintFrom(e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">To</label>
                  <input
                    type="date"
                    value={expPrintTo}
                    onChange={(e) => setExpPrintTo(e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <button
                  onClick={printExpenses}
                  disabled={printing || !expPrintFrom || !expPrintTo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {printing
                    ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                    : <HiOutlinePrinter className="w-4 h-4" />
                  }
                  {printing ? 'Preparing…' : 'Print Report'}
                </button>
              </div>
            )}

            {expenseSummary.length === 0 ? (
              <p className="text-gray-400 text-sm">No expenses this month</p>
            ) : (() => {
              const grandTotal = expenseSummary.reduce((s, c) => s + parseFloat(c.total), 0);
              return (
                <div className="space-y-3">
                  {expenseSummary.map((cat) => {
                    const pct = grandTotal > 0 ? (parseFloat(cat.total) / grandTotal) * 100 : 0;
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">{cat.category}</span>
                          <span className="font-medium text-gray-900">{fmt(cat.total)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                    <span>Total this month</span>
                    <span className="font-semibold text-gray-700">
                      {fmt(expenseSummary.reduce((s, c) => s + parseFloat(c.total), 0))}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recent transactions */}
          <div className="card">
            <h3 className="font-semibold text-green-700 mb-4">Recent POS Transactions</h3>
            {overviewTxLoading ? (
              <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
                <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-gray-400 text-sm">No POS transactions found</p>
            ) : (
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.receipt_number}</p>
                      <p className="text-xs text-gray-400">
                        {tx.customer_name || 'Walk-in'} · {new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-green-600">{fmt(tx.net_amount)}</span>
                      <p className="text-xs text-gray-400 capitalize">{tx.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>
      )}

      {/* ── Transactions tab ──────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="card overflow-hidden p-0">
          {txLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <HiOutlineArrowPath className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Loading transactions…</span>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-10">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Receipt</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400 text-sm">No transactions found</td></tr>
                  ) : transactions.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{(txPage - 1) * 20 + idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-primary-600 text-xs">{tx.receipt_number}</td>
                      <td className="px-4 py-3 text-gray-500">{tx.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(tx.net_amount)}</td>
                      <td className="px-4 py-3 capitalize text-gray-500 text-xs">{tx.payment_method}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {txPagination && txPagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>Page {txPagination.page} of {txPagination.totalPages} ({txPagination.total} total)</span>
                  <div className="flex gap-2">
                    <button
                      disabled={txPagination.page <= 1}
                      onClick={() => { const p = txPage - 1; setTxPage(p); loadTransactions(p, selectedDate); }}
                      className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={txPagination.page >= txPagination.totalPages}
                      onClick={() => { const p = txPage + 1; setTxPage(p); loadTransactions(p, selectedDate); }}
                      className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Purchases tab ─────────────────────────────────────── */}
      {activeTab === 'purchases' && (
        <div className="card overflow-hidden p-0">
          {purchasesLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <HiOutlineArrowPath className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Loading purchases…</span>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-10">#</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Due</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabPurchases.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-10 text-center text-gray-400 text-sm">No purchases recorded for this date</td></tr>
                  ) : tabPurchases.map((p, idx) => {
                    const due = parseFloat(p.due_amount || 0);
                    const statusColors = {
                      paid:     'bg-green-50 text-green-700',
                      partial:  'bg-amber-50 text-amber-700',
                      unpaid:   'bg-red-50 text-red-600',
                      received: 'bg-blue-50 text-blue-700',
                      ordered:  'bg-gray-100 text-gray-600',
                    };
                    const statusClass = statusColors[p.payment_status] || statusColors[p.status] || 'bg-gray-100 text-gray-600';
                    const statusLabel = p.payment_status || p.status || '—';
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-primary-600 text-xs">{p.invoice_number || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{p.supplier_name || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(p.net_amount)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(p.paid_amount)}</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: due > 0 ? '#ef4444' : '#6b7280' }}>
                          {due > 0 ? fmt(due) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(p.purchase_date || p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {tabPurchases.length > 0 && (() => {
                  const total = tabPurchases.reduce((s, p) => s + parseFloat(p.net_amount  || 0), 0);
                  const paid  = tabPurchases.reduce((s, p) => s + parseFloat(p.paid_amount || 0), 0);
                  const due   = tabPurchases.reduce((s, p) => s + parseFloat(p.due_amount  || 0), 0);
                  return (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                        <td colSpan="3" className="px-4 py-3 text-gray-600">{tabPurchases.length} order{tabPurchases.length !== 1 ? 's' : ''}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{fmt(total)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{fmt(paid)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: due > 0 ? '#ef4444' : '#6b7280' }}>{due > 0 ? fmt(due) : '—'}</td>
                        <td colSpan="2" />
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </>
          )}
        </div>
      )}

      {/* ── Add Expense Modal ─────────────────────────────────── */}
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
              {expenseCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number" step="0.01" required
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
