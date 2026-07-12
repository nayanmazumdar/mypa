import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HiOutlinePlus, HiOutlinePrinter, HiOutlineMagnifyingGlass,
  HiOutlineReceiptPercent, HiOutlineXMark,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { posApi } from '../api/pos.api';
import LoadingSpinner from '../components/common/LoadingSpinner';
const PAY_COLORS = {
  cash:          'bg-green-100 text-green-700',
  card:          'bg-blue-100 text-blue-700',
  upi:           'bg-purple-100 text-purple-700',
  credit:        'bg-red-100 text-red-700',
  bank_transfer: 'bg-gray-100 text-gray-700',
};

export default function Sales() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const today        = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate,   setToDate]   = useState(today);
  const [txns,     setTxns]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [paySum,   setPaySum]   = useState({ totals: { cash:0, upi:0, card:0, credit:0 }, counts: { cash:0, upi:0, card:0, credit:0 } });
  const debounceRef = useRef(null);

  // ── load ──────────────────────────────────────────────────────
  const load = useCallback(async (pg = 1, from = fromDate, to = toDate, q = search) => {
    setLoading(true);
    try {
      const [txnRes, sumRes] = await Promise.allSettled([
        posApi.getTransactions({
          page: pg, limit: 50,
          ...(from && { start_date: from }),
          ...(to   && { end_date:   to   }),
          ...(q    && { search:     q    }),
        }),
        posApi.getPaymentSummary({
          ...(from && { start_date: from }),
          ...(to   && { end_date:   to   }),
        }),
      ]);
      if (txnRes.status === 'fulfilled') {
        setTxns((txnRes.value.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        setPagination(txnRes.value.pagination || null);
      } else {
        toast.error('Failed to load transactions');
      }
      if (sumRes.status === 'fulfilled') {
        const ps = sumRes.value?.data || sumRes.value;
        setPaySum(ps || { totals: { cash:0, upi:0, card:0, credit:0 }, counts: { cash:0, upi:0, card:0, credit:0 } });
      } else {
        console.error('[PaySum] error:', sumRes.reason);
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, search]);

  useEffect(() => { load(1); }, [load]);

  // Debounce search input — fires 400ms after user stops typing
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(1, fromDate, toDate, value);
    }, 400);
  };

  // ── derived — use txns directly (filtering is now server-side) ─
  const filtered = txns;

  // Totals from server-side aggregation (accurate across all pages)
  const totalRevenue  = (paySum.totals.cash || 0) + (paySum.totals.upi || 0) + (paySum.totals.card || 0) + (paySum.totals.credit || 0);
  const totalDiscount = filtered.reduce((s, t) => s + parseFloat(t.discount || 0), 0);
  const totalCash     = paySum.counts.cash   || 0;
  const totalUPI      = paySum.counts.upi    || 0;

  // Revenue by payment method (server-side, full date range)
  const revCash   = paySum.totals.cash   || 0;
  const revUPI    = paySum.totals.upi    || 0;
  const revCard   = paySum.totals.card   || 0;
  const revCredit = paySum.totals.credit || 0;

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

  // ── print individual bill ─────────────────────────────────────
  const [printingId, setPrintingId] = useState(null);

  const printBill = async (txn) => {
    setPrintingId(txn.id);
    try {
      const res = await posApi.getTransaction(txn.id);
      const detail = res.data || res;

      const shopName = user?.shop_name || 'MyPA Business';
      const logoUrl  = `${window.location.origin}/logo.png`;

      const dateStr = detail.created_at
        ? new Date(detail.created_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : '—';

      const itemsHtml = (detail.items || []).map(item => `
        <tr>
          <td>${item.product_name}</td>
          <td class="center">${parseFloat(item.quantity) % 1 === 0
            ? parseFloat(item.quantity)
            : parseFloat(item.quantity).toFixed(3)} ${item.unit === 'kg' ? 'kg' : 'pc'}</td>
          <td class="right">₹${parseFloat(item.unit_price).toFixed(2)}</td>
          <td class="right bold">₹${parseFloat(item.total).toFixed(2)}</td>
        </tr>`).join('');

      const changeAmt = parseFloat(detail.change_amount || 0);

      const w = window.open('', '_blank', 'width=400,height=650');
      if (!w) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }

      w.document.write(`<!DOCTYPE html><html><head>
  <title>Bill — ${detail.receipt_number}</title>
  <meta charset="utf-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;color:#111;
         width:300px;margin:0 auto;padding:16px}
    .logo-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px}
    .logo-row img{height:28px;width:auto}
    .brand{font-size:16px;font-weight:700;color:#863bff;letter-spacing:-0.3px}
    .center{text-align:center}.right{text-align:right}.bold{font-weight:700}
    .shop{font-size:13px;font-weight:700;text-align:center;margin-bottom:2px}
    .sub{font-size:11px;color:#555;text-align:center}
    .dashed{border-top:1px dashed #999;margin:8px 0}
    .solid{border-top:2px solid #111;margin:8px 0}
    .row{display:flex;justify-content:space-between;margin:2px 0;font-size:11px}
    .row .lbl{color:#555}
    table{width:100%;border-collapse:collapse;margin:4px 0}
    thead th{font-size:10px;text-transform:uppercase;border-bottom:1px solid #ccc;
             padding:3px 4px;text-align:left;font-weight:600}
    thead th.center{text-align:center}thead th.right{text-align:right}
    td{padding:3px 4px;font-size:11px;vertical-align:top}
    .total-row{display:flex;justify-content:space-between;font-size:13px;
               font-weight:700;margin:4px 0}
    .thank{text-align:center;font-size:11px;margin-top:10px;font-family:sans-serif;color:#555}
    .receipt-no{font-size:10px;color:#777;text-align:center;margin-top:2px}
    .footer-logo{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:10px}
    .footer-logo img{height:20px;width:auto}
    .footer-brand-name{font-size:13px;font-weight:800;color:#863bff;font-family:sans-serif}
    .sys-gen{text-align:center;font-size:9px;color:#aaa;font-family:sans-serif;
             margin-top:4px;font-style:italic;letter-spacing:0.02em}
    @media print{body{padding:8px}@page{margin:4mm}}
  </style>
</head><body>
  <div class="shop">${shopName}</div>
  <div class="sub">Tax Invoice / Bill of Supply</div>
  <div class="dashed"></div>
  <div class="row"><span class="lbl">Receipt:</span><span><b>${detail.receipt_number}</b></span></div>
  <div class="row"><span class="lbl">Date:</span><span>${dateStr}</span></div>
  ${detail.customer_name ? `<div class="row"><span class="lbl">Customer:</span><span>${detail.customer_name}</span></div>` : ''}
  <div class="dashed"></div>
  <table>
    <thead><tr>
      <th>Item</th>
      <th class="center">Qty</th>
      <th class="right">Rate</th>
      <th class="right">Amt</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="dashed"></div>
  <div class="row"><span class="lbl">Subtotal</span><span>₹${parseFloat(detail.total_amount).toFixed(2)}</span></div>
  ${parseFloat(detail.discount || 0) > 0
    ? `<div class="row"><span class="lbl">Discount</span><span>-₹${parseFloat(detail.discount).toFixed(2)}</span></div>`
    : ''}
  <div class="solid"></div>
  <div class="total-row"><span>TOTAL</span><span>₹${parseFloat(detail.net_amount).toFixed(2)}</span></div>
  <div class="dashed"></div>
  <div class="row"><span class="lbl">Paid (${detail.payment_method})</span><span>₹${parseFloat(detail.amount_received).toFixed(2)}</span></div>
  ${changeAmt > 0 ? `<div class="row"><span class="lbl">Change</span><span>₹${changeAmt.toFixed(2)}</span></div>` : ''}
  <div class="dashed"></div>
  <div class="thank">Thank you! Visit again.</div>
  <div class="receipt-no">— ${detail.receipt_number} —</div>
  <div class="dashed"></div>
  <div class="footer-logo">
    <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'"/>
    <span class="footer-brand-name">MyPA</span>
  </div>
  <div class="sys-gen">System Generated Bill, Does not require signature</div>
</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 300);
    } catch {
      toast.error('Failed to load bill details');
    } finally {
      setPrintingId(null);
    }
  };
  const printReport = () => {
    if (filtered.length === 0) { toast.error('No transactions to print'); return; }

    const adminName = user?.name      || 'Administrator';
    const shopName  = user?.shop_name || 'MyPA Business';
    const logoUrl   = `${window.location.origin}/logo.png`;
    const now       = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const fmtDate = (d) => d
      ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '—';
    const periodLabel = `${fmtDate(fromDate)} — ${fmtDate(toDate)}`;

    const rows = filtered.map((t, idx) => {
      const payCls = t.payment_method === 'cash'   ? 'green' :
                     t.payment_method === 'upi'    ? 'purple' :
                     t.payment_method === 'card'   ? 'blue' :
                     t.payment_method === 'credit' ? 'red' : 'gray';
      const date = t.created_at
        ? new Date(t.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—';
      const time = t.created_at
        ? new Date(t.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })
        : '';
      return `<tr>
        <td class="center">${idx + 1}</td>
        <td class="mono">${t.receipt_number || '—'}</td>
        <td>${t.customer_name || 'Walk-in'}</td>
        <td class="right">${fmt(t.total_amount)}</td>
        <td class="center">${parseFloat(t.discount || 0) > 0 ? fmt(t.discount) : '—'}</td>
        <td class="right bold">${fmt(t.net_amount)}</td>
        <td class="center"><span class="badge ${payCls}">${t.payment_method}</span></td>
        <td class="center">${fmt(t.amount_received)}</td>
        <td class="center">${date}<br><span class="time">${time}</span></td>
      </tr>`;
    }).join('');

    const w = window.open('', '_blank', 'width=1100,height=750');
    if (!w) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }

    // Build payment breakdown rows — only show methods that have sales
    const payBreakdown = [
      { label: 'Cash',        cls: 'green',  rev: revCash,   count: filtered.filter(t => t.payment_method === 'cash').length },
      { label: 'UPI',         cls: 'purple', rev: revUPI,    count: filtered.filter(t => t.payment_method === 'upi').length },
      { label: 'Card',        cls: 'blue',   rev: revCard,   count: filtered.filter(t => t.payment_method === 'card').length },
      { label: 'Udhar/Credit',cls: 'red',    rev: revCredit, count: filtered.filter(t => t.payment_method === 'credit').length },
    ].filter(p => p.count > 0);

    const breakdownRows = payBreakdown.map(p =>
      `<tr>
        <td><span class="badge ${p.cls}">${p.label}</span></td>
        <td class="center">${p.count}</td>
        <td class="right bold">${fmt(p.rev)}</td>
       </tr>`
    ).join('');

    w.document.write(`<!DOCTYPE html><html><head>
  <title>POS Sales Report</title><meta charset="utf-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;padding:28px}
    .letterhead{display:flex;align-items:center;justify-content:space-between;
      border-bottom:3px solid #863bff;padding-bottom:12px;margin-bottom:14px}
    .lh-left .shop{font-size:15px;font-weight:700;color:#111}
    .lh-left .admin{font-size:12px;color:#6b7280;margin-top:3px}
    .lh-right{text-align:right;font-size:11px;color:#9ca3af}
    h1{font-size:18px;font-weight:700;margin-bottom:3px}
    .meta{font-size:11px;color:#6b7280}
    .period-badge{display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;
      border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;margin:10px 0 14px}
    .summary{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .s-box{border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;min-width:110px}
    .s-box .lbl{font-size:10px;color:#6b7280}
    .s-box .val{font-size:18px;font-weight:700;margin-top:1px}
    .val.green{color:#15803d}.val.amber{color:#b45309}.val.gray{color:#374151}
    .val.blue{color:#1d4ed8}.val.purple{color:#7c3aed}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#f3f4f6}
    th{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;
       color:#6b7280;padding:8px 9px;text-align:left;border-bottom:2px solid #e5e7eb}
    th.center,td.center{text-align:center}
    th.right,td.right{text-align:right}
    td{padding:7px 9px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
    tr:nth-child(even){background:#fafafa}
    td.mono{font-family:monospace;font-size:11px}
    td.bold{font-weight:700}
    .time{font-size:10px;color:#9ca3af}
    .badge{display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600}
    .badge.green{background:#dcfce7;color:#15803d}
    .badge.blue{background:#dbeafe;color:#1d4ed8}
    .badge.purple{background:#ede9fe;color:#7c3aed}
    .badge.red{background:#fee2e2;color:#b91c1c}
    .badge.gray{background:#f3f4f6;color:#374151}
    .breakdown-section{margin-top:24px;display:flex;justify-content:flex-end}
    .breakdown-box{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;min-width:340px}
    .breakdown-title{background:#f9fafb;padding:8px 14px;font-size:11px;font-weight:700;
      text-transform:uppercase;letter-spacing:.05em;color:#374151;border-bottom:1px solid #e5e7eb}
    .breakdown-box table{width:100%;border-collapse:collapse}
    .breakdown-box th{font-size:10px;font-weight:600;text-transform:uppercase;color:#9ca3af;
      padding:6px 12px;border-bottom:1px solid #f3f4f6;text-align:left}
    .breakdown-box th.right,.breakdown-box td.right{text-align:right}
    .breakdown-box th.center,.breakdown-box td.center{text-align:center}
    .breakdown-box td{padding:7px 12px;border-bottom:1px solid #f9fafb;font-size:12px;vertical-align:middle}
    .breakdown-box tr:last-child td{border-bottom:none}
    .breakdown-total{background:#f3f4f6;padding:8px 14px;display:flex;
      justify-content:space-between;align-items:center;border-top:2px solid #d1d5db}
    .breakdown-total .lbl{font-size:11px;font-weight:700;color:#374151}
    .breakdown-total .val{font-size:15px;font-weight:800;color:#15803d}
    .signature-section{margin-top:40px;display:flex;justify-content:flex-end}
    .signature-box{width:220px}
    .signature-line{border-top:1.5px solid #374151;margin-bottom:5px}
    .signature-name{font-size:13px;font-weight:700}
    .signature-title{font-size:11px;color:#6b7280;margin-top:2px}
    .signature-date{font-size:11px;color:#9ca3af;margin-top:3px}
    .footer{margin-top:18px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;
      padding-top:8px;display:flex;justify-content:space-between;align-items:center}
    .footer-brand{display:flex;align-items:center;gap:7px}
    .footer-brand img{height:20px;width:auto}
    .brand-name{font-size:12px;font-weight:800;color:#863bff}
    .brand-tagline{font-size:9px;color:#9b7fd4;margin-top:1px}
    @media print{body{padding:14px}tr{page-break-inside:avoid}}
  </style>
</head><body>
  <div class="letterhead">
    <div class="lh-left">
      <div class="shop">${shopName}</div>
      <div class="admin">${adminName}</div>
    </div>
    <div class="lh-right">
      <div>POS Sales Report</div>
      <div style="margin-top:2px">Generated: ${now}</div>
    </div>
  </div>

  <h1>POS Transaction Report</h1>
  <div class="meta">Total transactions shown: ${filtered.length}</div>
  <div class="period-badge">&#128197; Period: ${periodLabel}</div>

  <div class="summary">
    <div class="s-box"><div class="lbl">Transactions</div><div class="val gray">${filtered.length}</div></div>
    <div class="s-box"><div class="lbl">Total Sales</div><div class="val green">${fmt(totalRevenue)}</div></div>
    <div class="s-box"><div class="lbl">Total Discount</div><div class="val amber">${fmt(totalDiscount)}</div></div>
    <div class="s-box"><div class="lbl">Cash Sales</div><div class="val blue">${totalCash}</div></div>
    <div class="s-box"><div class="lbl">UPI Sales</div><div class="val purple">${totalUPI}</div></div>
  </div>

  <table>
    <thead><tr>
      <th class="center" style="width:40px">S.No</th>
      <th style="width:120px">Receipt #</th>
      <th>Customer</th>
      <th class="right" style="width:90px">Subtotal</th>
      <th class="center" style="width:80px">Discount</th>
      <th class="right" style="width:90px">Net Amount</th>
      <th class="center" style="width:80px">Payment</th>
      <th class="right" style="width:90px">Received</th>
      <th class="center" style="width:100px">Date & Time</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="breakdown-section">
    <div class="breakdown-box">
      <div class="breakdown-title">&#128179; Payment-wise Summary</div>
      <table>
        <thead><tr>
          <th style="width:140px">Mode</th>
          <th class="center" style="width:90px">Transactions</th>
          <th class="right">Amount</th>
        </tr></thead>
        <tbody>${breakdownRows}</tbody>
      </table>
      <div class="breakdown-total">
        <span class="lbl">Total (${filtered.length} transactions)</span>
        <span class="val">${fmt(totalRevenue)}</span>
      </div>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div style="height:40px"></div>
      <div class="signature-line"></div>
      <div class="signature-name">${adminName}</div>
      <div class="signature-title">Business Administrator</div>
      <div class="signature-date">Date: ${now}</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-brand">
      <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'"/>
      <div>
        <div class="brand-name">MyPA</div>
        <div class="brand-tagline">POS Sales Management System</div>
      </div>
    </div>
    <span>Period: ${periodLabel}</span>
  </div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (loading && txns.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500">POS transaction history</p>
        </div>
        <button onClick={() => navigate('/pos')} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> New Sale
        </button>
      </div>

      {/* ── Filters bar ────────────────────────────────────── */}
      <div className="card flex flex-wrap items-end gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 shrink-0">From</label>
            <input type="date" value={fromDate} max={toDate || today}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field text-sm py-1.5" />
          </div>
          <span className="text-gray-400 shrink-0">—</span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 shrink-0">To</label>
            <input type="date" value={toDate} min={fromDate || undefined} max={today}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field text-sm py-1.5" />
          </div>
          <button
            onClick={() => { setPage(1); load(1, fromDate, toDate); }}
            className="btn-primary text-sm py-1.5 px-4 shrink-0"
          >
            <HiOutlineMagnifyingGlass className="w-4 h-4 inline mr-1" /> Search
          </button>
          <button
            onClick={() => { setFromDate(firstOfMonth); setToDate(today); setPage(1); load(1, firstOfMonth, today); }}
            className="text-xs text-primary-600 hover:underline shrink-0"
          >
            This month
          </button>
        </div>

        {/* Search within results */}
        <div className="relative flex-1 min-w-[180px]">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={search} placeholder="Filter by receipt # or customer…"
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field text-sm pl-8 py-1.5 pr-7" />
          {search && (
            <button onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <HiOutlineXMark className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Print button */}
        <button onClick={printReport} disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
          <HiOutlinePrinter className="w-4 h-4" /> Print Report
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{pagination?.total ?? filtered.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Sales</p>
            <p className="text-xl font-bold text-green-600">{fmt(totalRevenue)}</p>
          </div>
          <div className="card p-4 border-l-4 border-green-400">
            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Cash</p>
            <p className="text-xl font-bold text-green-700">{fmt(revCash)}</p>
            <p className="text-xs text-gray-400">{totalCash} txns</p>
          </div>
          <div className="card p-4 border-l-4 border-purple-400">
            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">UPI</p>
            <p className="text-xl font-bold text-purple-700">{fmt(revUPI)}</p>
            <p className="text-xs text-gray-400">{totalUPI} txns</p>
          </div>
          <div className="card p-4 border-l-4 border-blue-400">
            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Card</p>
            <p className="text-xl font-bold text-blue-700">{fmt(revCard)}</p>
            <p className="text-xs text-gray-400">{paySum.counts.card || 0} txns</p>
          </div>
          <div className="card p-4 border-l-4 border-red-400">
            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Udhaar</p>
            <p className="text-xl font-bold text-red-600">{fmt(revCredit)}</p>
            <p className="text-xs text-gray-400">{paySum.counts.credit || 0} txns</p>
          </div>
        </div>
      )}

      {/* ── Transactions table ─────────────────────────────── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Receipt #</th>                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Discount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Received</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time ↓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <HiOutlineReceiptPercent className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No transactions found for this period.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-primary-600">{t.receipt_number}</span>
                        <button
                          onClick={() => printBill(t)}
                          disabled={printingId === t.id}
                          title="Print bill"
                          className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-40 transition-colors"
                        >
                          {printingId === t.id
                            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                            : <HiOutlinePrinter className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(t.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 text-xs">
                      {parseFloat(t.discount || 0) > 0 ? fmt(t.discount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(t.net_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAY_COLORS[t.payment_method] || 'bg-gray-100 text-gray-700'}`}>
                        {t.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(t.amount_received)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(p); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); load(p); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
