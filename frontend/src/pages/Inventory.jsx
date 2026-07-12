import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineCube, HiOutlineExclamationTriangle, HiOutlineCheck,
  HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlinePencil, HiOutlinePlus,
  HiOutlineChartBar, HiOutlinePrinter, HiOutlineBell,
  HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { fetchInventory, fetchLowStock, updateStock } from '../store/inventorySlice';
import { inventoryApi } from '../api/inventory.api';
import { productApi } from '../api/product.api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Inventory() {
  const dispatch = useDispatch();
  const { items, pagination, loading, updating } = useSelector((state) => state.inventory);
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState({});
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Add/Adjust Stock modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [stockForm, setStockForm] = useState({
    product_id: '', quantity: '', type: 'adjustment', notes: '',
  });
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Stock report
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportTab, setReportTab] = useState('summary');
  const printRef = useRef(null);

  // Date range for report print
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  const [printFrom, setPrintFrom] = useState(firstOfMonth);
  const [printTo, setPrintTo] = useState(today);

  const load = useCallback((pg = 1) => {
    dispatch(fetchInventory({ page: pg, limit: 50 }));
    dispatch(fetchLowStock());
  }, [dispatch]);

  useEffect(() => { load(1); }, [load]);

  // derived counts
  const lowStockItems = items.filter(i =>
    parseFloat(i.min_stock_level) > 0 &&
    parseFloat(i.quantity) <= parseFloat(i.min_stock_level)
  );
  const outOfStockItems = items.filter(i => parseFloat(i.quantity) <= 0);

  // Reset alert dismissal whenever low stock count rises
  useEffect(() => {
    if (lowStockItems.length > 0) setAlertDismissed(false);
  }, [lowStockItems.length]);

  // filtered table list
  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchLow = !filterLow ||
      parseFloat(item.quantity) <= parseFloat(item.min_stock_level || 0);
    return matchSearch && matchLow;
  });

  // ── inline edit helpers ────────────────────────────────────────────────
  const startEdit = (item) => setEditing(prev => ({
    ...prev,
    [item.product_id]: {
      quantity: String(parseFloat(item.quantity)),
      min_stock_level: String(parseFloat(item.min_stock_level || 0)),
      notes: '',
    },
  }));

  const cancelEdit = (pid) => setEditing(prev => {
    const n = { ...prev }; delete n[pid]; return n;
  });

  const updateField = (pid, field, value) =>
    setEditing(prev => ({ ...prev, [pid]: { ...prev[pid], [field]: value } }));

  const saveEdit = async (item) => {
    const edit = editing[item.product_id];
    if (!edit) return;
    const newQty = parseFloat(edit.quantity);
    const newMin = parseFloat(edit.min_stock_level);
    const oldQty = parseFloat(item.quantity);
    const oldMin = parseFloat(item.min_stock_level || 0);
    if (isNaN(newQty) || newQty < 0) { toast.error('Enter a valid quantity (0 or greater)'); return; }
    if (isNaN(newMin) || newMin < 0) { toast.error('Enter a valid min stock level (0 or greater)'); return; }
    const qtyChanged = newQty !== oldQty;
    const minChanged = newMin !== oldMin;
    if (!qtyChanged && !minChanged) { cancelEdit(item.product_id); return; }
    try {
      const promises = [];
      if (qtyChanged) promises.push(dispatch(updateStock({
        product_id: item.product_id, quantity: newQty, type: 'adjustment',
        notes: edit.notes.trim() || 'Inline inventory update',
      })).unwrap());
      if (minChanged) promises.push(inventoryApi.updateLevels({
        product_id: item.product_id, min_stock_level: newMin,
      }));
      await Promise.all(promises);
      toast.success(`${item.product_name} updated`);
      cancelEdit(item.product_id);
      load();
    } catch (err) { toast.error(err?.message || 'Failed to update'); }
  };

  // ── Add/Adjust Stock modal ────────────────────────────────────────────
  const openStockModal = useCallback(async () => {
    setStockForm({ product_id: '', quantity: '', type: 'adjustment', notes: '' });
    setShowStockModal(true);
    setProductsLoading(true);
    try {
      const res = await productApi.getAll({ limit: 500, page: 1 });
      setAllProducts(res.data || []);
    } catch { toast.error('Failed to load product list'); setAllProducts([]); }
    finally { setProductsLoading(false); }
  }, []);

  const submitStockModal = async (e) => {
    e.preventDefault();
    const qty = parseFloat(stockForm.quantity);
    if (!stockForm.product_id) { toast.error('Please select a product'); return; }
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity (0 or greater)'); return; }
    setStockSubmitting(true);
    try {
      await dispatch(updateStock({
        product_id: parseInt(stockForm.product_id), quantity: qty,
        type: stockForm.type, notes: stockForm.notes.trim() || undefined,
      })).unwrap();
      const lbl = { in: 'added', out: 'removed', adjustment: 'set' }[stockForm.type];
      toast.success(`Stock ${lbl} successfully`);
      setShowStockModal(false);
      load();
    } catch (err) { toast.error(err?.message || 'Failed to update stock'); }
    finally { setStockSubmitting(false); }
  };

  // ── Stock Report ──────────────────────────────────────────────────────
  const openReport = async () => {
    setShowReport(true);
    setReportTab('summary');
    if (reportData) return; // use cached data unless refreshed
    setReportLoading(true);
    try {
      const res = await inventoryApi.getReport();
      setReportData(res.data || res);
    } catch { toast.error('Failed to load stock report'); }
    finally { setReportLoading(false); }
  };

  const refreshReport = async () => {
    setReportLoading(true);
    try {
      const res = await inventoryApi.getReport();
      setReportData(res.data || res);
    } catch { toast.error('Failed to refresh report'); }
    finally { setReportLoading(false); }
  };

  const printReport = () => {
    // Validate date range
    if (printFrom && printTo && printFrom > printTo) {
      toast.error('"From" date cannot be after "To" date');
      return;
    }

    // Stock snapshot source
    const source = reportData?.items?.length
      ? reportData.items
      : items.map(i => ({
          product_name: i.product_name,
          sku: i.sku,
          quantity: i.quantity,
          unit: i.unit,
          min_stock_level: i.min_stock_level,
        }));

    if (!source || source.length === 0) {
      toast.error('No inventory data to print');
      return;
    }

    const w = window.open('', '_blank', 'width=960,height=750');
    if (!w) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }

    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const fmtDate = (d) => d
      ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    const periodLabel = printFrom || printTo
      ? `${fmtDate(printFrom)} — ${fmtDate(printTo)}`
      : 'All time';

    const statusLabel = (qty, min) => {
      const q = parseFloat(qty), m = parseFloat(min || 0);
      if (q <= 0)          return { text: 'Out of Stock', cls: 'out' };
      if (m > 0 && q <= m) return { text: 'Low Stock',    cls: 'low' };
      return                { text: 'In Stock',           cls: 'in'  };
    };

    const stockRows = source.map((item, idx) => {
      const qty = parseFloat(item.quantity);
      const qtyDisplay = qty % 1 === 0 ? qty : qty.toFixed(2);
      const unit = item.unit || '';
      const s = statusLabel(item.quantity, item.min_stock_level);
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td>${item.product_name}${item.sku ? `<br><span class="sku">${item.sku}</span>` : ''}</td>
          <td class="center">${qtyDisplay}${unit ? ` ${unit}` : ''}</td>
          <td class="center"><span class="badge ${s.cls}">${s.text}</span></td>
        </tr>`;
    }).join('');

    // Summary counts
    const total    = source.length;
    const inStock  = source.filter(i => parseFloat(i.quantity) > 0 && !(parseFloat(i.min_stock_level) > 0 && parseFloat(i.quantity) <= parseFloat(i.min_stock_level))).length;
    const lowStock = source.filter(i => parseFloat(i.min_stock_level) > 0 && parseFloat(i.quantity) > 0 && parseFloat(i.quantity) <= parseFloat(i.min_stock_level)).length;
    const outStock = source.filter(i => parseFloat(i.quantity) <= 0).length;

    // Movements filtered by date range
    const allMovements = reportData?.recent_movements || [];
    const filteredMovements = allMovements.filter(m => {
      const d = m.created_at ? m.created_at.split('T')[0] : '';
      if (printFrom && d < printFrom) return false;
      if (printTo   && d > printTo)   return false;
      return true;
    });

    const movRows = filteredMovements.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px">No movements in this period</td></tr>`
      : filteredMovements.map((m, idx) => {
          const typeCls = m.type === 'in' ? 'mov-in' : m.type === 'out' ? 'mov-out' : 'mov-adj';
          const typeArrow = m.type === 'in' ? '↑' : m.type === 'out' ? '↓' : '~';
          const d = m.created_at
            ? new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
          return `<tr>
            <td class="center">${idx + 1}</td>
            <td>${m.product_name}${m.sku ? `<br><span class="sku">${m.sku}</span>` : ''}</td>
            <td class="center"><span class="badge ${typeCls}">${typeArrow} ${m.type}</span></td>
            <td class="col-qty">${parseFloat(m.quantity)}</td>
            <td class="col-notes">${m.notes || '—'}</td>
            <td class="center">${d}</td>
          </tr>`;
        }).join('');

    // Business info from logged-in user
    const adminName  = user?.name      || 'Administrator';
    const shopName   = user?.shop_name || 'MyPA Business';

    // logo.png lives in /public — use absolute URL so the print window can load it
    const logoUrl = `${window.location.origin}/logo.png`;

    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Stock Report</title>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }

    /* ── letterhead ── */
    .letterhead { display: flex; align-items: center; justify-content: space-between;
                  border-bottom: 3px solid #863bff; padding-bottom: 14px; margin-bottom: 18px; }
    .letterhead-right { text-align: right; }
    .letterhead-right .shop { font-size: 15px; font-weight: 700; color: #111; }
    .letterhead-right .admin { font-size: 12px; color: #6b7280; margin-top: 3px; }
    .letterhead-left .shop { font-size: 15px; font-weight: 700; color: #111; }
    .letterhead-left .admin { font-size: 12px; color: #6b7280; margin-top: 3px; }

    /* ── report title ── */
    .report-title { margin-bottom: 6px; }
    .report-title h1 { font-size: 18px; font-weight: 700; color: #111; }
    .report-title .meta { font-size: 12px; color: #6b7280; margin-top: 4px; display: flex; gap: 20px; flex-wrap: wrap; }

    .period-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
      border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .summary-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; min-width: 100px; }
    .summary-box .label { font-size: 11px; color: #6b7280; }
    .summary-box .value { font-size: 20px; font-weight: 700; margin-top: 2px; }
    .value.green { color: #15803d; } .value.amber { color: #b45309; }
    .value.red   { color: #b91c1c; } .value.gray  { color: #374151; }
    h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
         color: #374151; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    thead tr { background: #f3f4f6; }
    th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
         color: #6b7280; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
    th.center, td.center { text-align: center; }
    td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    /* explicit column separator between Qty and Notes */
    .col-qty  { text-align: center; padding-right: 20px; border-right: 1px solid #e5e7eb; }
    .col-notes { padding-left: 20px; }
    tr:nth-child(even) { background: #fafafa; }
    .sku { font-size: 11px; color: #9ca3af; font-family: monospace; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge.in   { background: #dcfce7; color: #15803d; }
    .badge.low  { background: #fef3c7; color: #92400e; }
    .badge.out  { background: #fee2e2; color: #b91c1c; }
    .badge.mov-in  { background: #dcfce7; color: #15803d; }
    .badge.mov-out { background: #fee2e2; color: #b91c1c; }
    .badge.mov-adj { background: #f3f4f6; color: #374151; }

    /* ── signature area ── */
    .signature-section { margin-top: 48px; display: flex; justify-content: flex-end; }
    .signature-box { width: 240px; }
    .signature-line { border-top: 1.5px solid #374151; margin-bottom: 6px; }
    .signature-name { font-size: 13px; font-weight: 700; color: #111; }
    .signature-title { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .signature-date { font-size: 11px; color: #9ca3af; margin-top: 4px; }

    .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;
              padding-top: 10px; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { display: flex; align-items: center; gap: 8px; }
    .footer-brand img { height: 24px; width: auto; }
    .footer-brand .brand-name { font-size: 13px; font-weight: 800; color: #863bff; letter-spacing: -0.3px; }
    .footer-brand .brand-tagline { font-size: 10px; color: #9b7fd4; margin-top: 1px; }
    @media print {
      body { padding: 16px; }
      h2 { page-break-before: auto; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      .signature-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- ── Letterhead ── -->
  <div class="letterhead">
    <div class="letterhead-left">
      <div class="shop">${shopName}</div>
      <div class="admin">${adminName}</div>
    </div>
    <div class="letterhead-right">
      <div style="font-size:11px;color:#9ca3af;">Stock Inventory Report</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Generated: ${now}</div>
    </div>
  </div>

  <!-- ── Report title ── -->
  <div class="report-title">
    <h1>Stock Inventory Report</h1>
    <div class="meta">
      <span>Generated: ${now}</span>
      <span>Products: ${total}</span>
    </div>
  </div>
  <div class="period-badge">&#128197; Report Period: ${periodLabel}</div>

  <!-- ── Summary cards ── -->
  <div class="summary">
    <div class="summary-box"><div class="label">Total Products</div><div class="value gray">${total}</div></div>
    <div class="summary-box"><div class="label">In Stock</div><div class="value green">${inStock}</div></div>
    <div class="summary-box"><div class="label">Low Stock</div><div class="value amber">${lowStock}</div></div>
    <div class="summary-box"><div class="label">Out of Stock</div><div class="value red">${outStock}</div></div>
  </div>

  <!-- ── Stock Snapshot ── -->
  <h2>Current Stock Snapshot</h2>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:56px">S. No.</th>
        <th>Product Name</th>
        <th class="center" style="width:160px">Quantity Available</th>
        <th class="center" style="width:140px">Stock Status</th>
      </tr>
    </thead>
    <tbody>${stockRows}</tbody>
  </table>

  <!-- ── Movements ── -->
  <h2>Stock Movements — ${periodLabel}</h2>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:56px">S. No.</th>
        <th>Product Name</th>
        <th class="center" style="width:110px">Type</th>
        <th class="col-qty" style="width:80px">Qty</th>
        <th class="col-notes" style="padding-left:20px">Notes</th>
        <th class="center" style="width:110px">Date</th>
      </tr>
    </thead>
    <tbody>${movRows}</tbody>
  </table>

  <!-- ── Signature ── -->
  <div class="signature-section">
    <div class="signature-box">
      <div style="height:48px"></div>
      <div class="signature-line"></div>
      <div class="signature-name">${adminName}</div>
      <div class="signature-title">Business Administrator</div>
      <div class="signature-date">Date: ${now}</div>
    </div>
  </div>

  <!-- ── Footer ── -->
  <div class="footer">
    <div class="footer-brand">
      <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'" />
      <div>
        <div class="brand-name">MyPA</div>
        <div class="brand-tagline">Inventory Management System</div>
      </div>
    </div>
    <span>Period: ${periodLabel}</span>
  </div>

</body>
</html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // ── status helpers ────────────────────────────────────────────────────
  const getStatus = (qty, min) => {
    const q = parseFloat(qty), m = parseFloat(min || 0);
    if (q <= 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' };
    if (m > 0 && q <= m) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'In Stock', cls: 'bg-green-100 text-green-700' };
  };

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Click any row to edit quantities and stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HiOutlineChartBar className="w-4 h-4" /> Stock Report
          </button>
          <button onClick={openStockModal} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Add / Adjust Stock
          </button>
        </div>
      </div>

      {/* ── Min-Level Alert Banner ─────────────────────────────────────── */}
      {!alertDismissed && lowStockItems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className="relative flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-50" />
                <HiOutlineBell className="relative w-6 h-6 text-amber-600" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm">
                {lowStockItems.length} product{lowStockItems.length !== 1 ? 's' : ''} at or below minimum stock level
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.slice(0, 8).map(i => (
                  <span key={i.product_id}
                    className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-800 text-xs px-2 py-1 rounded-full font-medium"
                  >
                    {parseFloat(i.quantity) <= 0
                      ? <HiOutlineCube className="w-3 h-3 text-red-500" />
                      : <HiOutlineExclamationTriangle className="w-3 h-3 text-amber-500" />}
                    {i.product_name}
                    <span className="text-amber-500 font-bold">
                      {parseFloat(i.quantity) % 1 === 0
                        ? parseFloat(i.quantity)
                        : parseFloat(i.quantity).toFixed(2)}
                      /{parseFloat(i.min_stock_level)}
                    </span>
                  </span>
                ))}
                {lowStockItems.length > 8 && (
                  <span className="text-xs text-amber-700 font-medium self-center">
                    +{lowStockItems.length - 8} more
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => { setFilterLow(true); setAlertDismissed(true); }}
                  className="text-xs font-semibold text-amber-700 underline hover:no-underline"
                >
                  Show only low stock
                </button>
              </div>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              className="flex-shrink-0 text-amber-500 hover:text-amber-700 p-1 rounded"
              aria-label="Dismiss alert"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{pagination?.total ?? items.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">In Stock</p>
          <p className="text-2xl font-bold text-green-600">
            {items.filter(i => parseFloat(i.quantity) > 0 &&
              (parseFloat(i.min_stock_level) === 0 || parseFloat(i.quantity) > parseFloat(i.min_stock_level))).length}
          </p>
        </div>
        <div
          className={`card p-4 cursor-pointer transition-colors ${filterLow ? 'border-amber-400 bg-amber-50' : 'hover:border-amber-300'}`}
          onClick={() => setFilterLow(f => !f)}
          role="button"
          aria-pressed={filterLow}
          title="Click to filter low stock"
        >
          <p className="text-xs text-gray-500 mb-1">Low Stock</p>
          <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {lowStockItems.length}
          </p>
          {filterLow && <p className="text-xs text-amber-600 mt-1">Filtered ✓</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Out of Stock</p>
          <p className={`text-2xl font-bold ${outOfStockItems.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {outOfStockItems.length}
          </p>
        </div>
      </div>

      {/* ── Search + filters ──────────────────────────────────────────── */}
      <div className="card flex items-center gap-3">
        <HiOutlineMagnifyingGlass className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by product name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        )}
        {filterLow && (
          <button
            onClick={() => setFilterLow(false)}
            className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-200"
          >
            <HiOutlineExclamationTriangle className="w-3 h-3" /> Low Stock
            <HiOutlineXMark className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Table with inline editing ──────────────────────────────────── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-[30%]">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-[12%]">SKU</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-[12%]">Quantity</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-[12%]">Min Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-[12%]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-[16%]">Notes</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-[6%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center">
                    <HiOutlineCube className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {items.length === 0
                        ? 'No inventory records yet. Add stock to your products to get started.'
                        : 'No results match your search.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isEditing = !!editing[item.product_id];
                  const editData = editing[item.product_id];
                  const qty = isEditing ? editData.quantity : String(parseFloat(item.quantity));
                  const minLevel = isEditing ? editData.min_stock_level : String(parseFloat(item.min_stock_level || 0));
                  const status = getStatus(qty, minLevel);
                  const isAlert = parseFloat(minLevel) > 0 && parseFloat(qty) <= parseFloat(minLevel) && !isEditing;

                  return (
                    <tr key={item.id}
                      className={`transition-colors ${isEditing ? 'bg-blue-50' : isAlert ? 'bg-amber-50/40' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isAlert && <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            {isEditing && <p className="text-xs text-blue-600 mt-0.5">Editing mode</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input type="number" step="0.01" min="0" value={editData.quantity}
                            onChange={(e) => updateField(item.product_id, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 text-right border border-blue-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus />
                        ) : (
                          <span onClick={() => startEdit(item)} title="Click to edit"
                            className={`font-semibold tabular-nums cursor-pointer hover:underline ${
                              parseFloat(qty) <= 0 ? 'text-red-600' :
                              parseFloat(minLevel) > 0 && parseFloat(qty) <= parseFloat(minLevel) ? 'text-amber-600' :
                              'text-gray-900'}`}>
                            {parseFloat(qty) % 1 === 0 ? parseFloat(qty) : parseFloat(qty).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input type="number" step="1" min="0" value={editData.min_stock_level}
                            onChange={(e) => updateField(item.product_id, 'min_stock_level', e.target.value)}
                            className="w-full px-2 py-1 text-right border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        ) : (
                          <span onClick={() => startEdit(item)} title="Click to edit"
                            className={`tabular-nums cursor-pointer hover:underline ${parseFloat(minLevel) > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                            {parseFloat(minLevel)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="text" placeholder="Optional note…" value={editData.notes}
                            onChange={(e) => updateField(item.product_id, 'notes', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => saveEdit(item)} disabled={updating}
                              className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-50" title="Save">
                              <HiOutlineCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => cancelEdit(item.product_id)} disabled={updating}
                              className="p-1 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-50" title="Cancel">
                              <HiOutlineXMark className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(item)}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => { const p = page - 1; setPage(p); dispatch(fetchInventory({ page: p, limit: 50 })); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); dispatch(fetchInventory({ page: p, limit: 50 })); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300">Next →</button>
            </div>
          </div>
        )}
      </div>

      {Object.keys(editing).length > 0 && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">{Object.keys(editing).length} item(s) in edit mode</span>
        </div>
      )}

      {/* ── Add / Adjust Stock Modal ───────────────────────────────────── */}
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title="Add / Adjust Stock">
        <form onSubmit={submitStockModal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            {productsLoading ? (
              <div className="input-field text-gray-400 text-sm">Loading products…</div>
            ) : (
              <select required value={stockForm.product_id}
                onChange={(e) => setStockForm(f => ({ ...f, product_id: e.target.value }))}
                className="input-field">
                <option value="">— Select a product —</option>
                {allProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                ))}
              </select>
            )}
            {!productsLoading && allProducts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No products found. Add products first.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'in', label: 'Stock In', desc: 'Add to stock' },
                { value: 'out', label: 'Stock Out', desc: 'Remove from stock' },
                { value: 'adjustment', label: 'Adjustment', desc: 'Set exact quantity' },
              ].map(({ value, label, desc }) => (
                <button key={value} type="button" onClick={() => setStockForm(f => ({ ...f, type: value }))}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    stockForm.type === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs opacity-70">{desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
              {stockForm.type === 'adjustment' && <span className="ml-1 text-xs font-normal text-gray-400">(sets the new stock level)</span>}
            </label>
            <input type="number" required min="0" step="0.01" value={stockForm.quantity}
              onChange={(e) => setStockForm(f => ({ ...f, quantity: e.target.value }))}
              className="input-field" placeholder="0" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={stockForm.notes}
              onChange={(e) => setStockForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field" placeholder="Optional reason or reference…" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowStockModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={stockSubmitting || productsLoading} className="btn-primary disabled:opacity-50">
              {stockSubmitting ? 'Saving…' : 'Save Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Stock Report Modal ─────────────────────────────────────────── */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Stock Report">
        <div className="space-y-4 max-h-[80vh] flex flex-col">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Row 1: tabs + actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'summary',   label: 'Summary' },
                  { key: 'category',  label: 'By Category' },
                  { key: 'items',     label: 'All Items' },
                  { key: 'movements', label: 'Movements' },
                ].map(t => (
                  <button key={t.key} onClick={() => setReportTab(t.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      reportTab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={refreshReport} disabled={reportLoading}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40" title="Refresh">
                  <svg className={`w-4 h-4 ${reportLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button onClick={printReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-400 bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 active:scale-95 transition-all">
                  <HiOutlinePrinter className="w-3.5 h-3.5 animate-bounce" /> Print Report
                </button>
              </div>
            </div>

            {/* Row 2: date range picker */}
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="text-xs font-medium text-blue-700 shrink-0">Period:</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5 flex-1">
                  <label className="text-xs text-blue-600 shrink-0">From</label>
                  <input
                    type="date"
                    value={printFrom}
                    max={printTo || today}
                    onChange={(e) => setPrintFrom(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded border border-blue-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <span className="text-blue-400 text-xs shrink-0">—</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <label className="text-xs text-blue-600 shrink-0">To</label>
                  <input
                    type="date"
                    value={printTo}
                    min={printFrom || undefined}
                    max={today}
                    onChange={(e) => setPrintTo(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded border border-blue-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {reportLoading && !reportData ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : !reportData ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 py-12">Failed to load report</div>
          ) : (
            <div className="flex-1 overflow-y-auto" ref={printRef}>

              {/* ── Summary tab ── */}
              {reportTab === 'summary' && (() => {
                // Compute movement totals filtered by the selected date range
                const allMov = reportData.recent_movements || [];
                const inRange = allMov.filter(m => {
                  const d = m.created_at ? m.created_at.split('T')[0] : '';
                  if (printFrom && d < printFrom) return false;
                  if (printTo   && d > printTo)   return false;
                  return true;
                });
                const rangeIn  = inRange.filter(m => m.type === 'in').reduce((s, m) => s + parseFloat(m.quantity), 0);
                const rangeOut = inRange.filter(m => m.type === 'out').reduce((s, m) => s + parseFloat(m.quantity), 0);
                const rangeAdj = inRange.filter(m => m.type === 'adjustment').length;

                const fmtDate = (d) => d
                  ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : null;
                const periodLabel = (printFrom || printTo)
                  ? `${fmtDate(printFrom) || '…'} — ${fmtDate(printTo) || '…'}`
                  : 'Last 30 days';

                return (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Stock Value <span className="normal-case font-normal text-gray-400">(current snapshot)</span></h2>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 mb-1">Cost Value</p>
                        <p className="text-xl font-bold text-gray-900">{fmt(reportData.summary?.total_cost_value)}</p>
                        <p className="text-xs text-gray-400 mt-1">at purchase price</p>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                        <p className="text-xs text-gray-500 mb-1">Sale Value</p>
                        <p className="text-xl font-bold text-green-700">{fmt(reportData.summary?.total_sale_value)}</p>
                        <p className="text-xs text-gray-400 mt-1">at selling price</p>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs text-gray-500 mb-1">Potential Profit</p>
                        <p className="text-xl font-bold text-blue-700">{fmt(reportData.summary?.potential_profit)}</p>
                        <p className="text-xs text-gray-400 mt-1">if all sold</p>
                      </div>
                    </div>

                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Stock Status <span className="normal-case font-normal text-gray-400">(current snapshot)</span></h2>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{reportData.summary?.in_stock}</p>
                        <p className="text-xs text-gray-500 mt-1">In Stock</p>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{reportData.summary?.low_stock}</p>
                        <p className="text-xs text-gray-500 mt-1">Low Stock</p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{reportData.summary?.out_of_stock}</p>
                        <p className="text-xs text-gray-500 mt-1">Out of Stock</p>
                      </div>
                    </div>

                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Movements
                      <span className="ml-2 normal-case font-normal text-gray-400 text-xs">{periodLabel}</span>
                    </h2>
                    {inRange.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4 rounded-xl border border-dashed border-gray-200">
                        No stock movements in this period
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex items-center gap-3 rounded-xl border p-3 bg-gray-50">
                          <HiOutlineArrowTrendingUp className="w-7 h-7 text-green-500 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Stock In</p>
                            <p className="text-lg font-bold text-gray-900">{rangeIn % 1 === 0 ? rangeIn : rangeIn.toFixed(2)} <span className="text-xs font-normal text-gray-400">units</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3 bg-gray-50">
                          <HiOutlineArrowTrendingDown className="w-7 h-7 text-red-400 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Stock Out</p>
                            <p className="text-lg font-bold text-gray-900">{rangeOut % 1 === 0 ? rangeOut : rangeOut.toFixed(2)} <span className="text-xs font-normal text-gray-400">units</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border p-3 bg-gray-50">
                          <span className="text-2xl text-gray-400 shrink-0 leading-none">~</span>
                          <div>
                            <p className="text-xs text-gray-500">Adjustments</p>
                            <p className="text-lg font-bold text-gray-900">{rangeAdj} <span className="text-xs font-normal text-gray-400">times</span></p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── By Category tab ── */}
              {reportTab === 'category' && (
                <div className="space-y-3">
                  {(!reportData.by_category || reportData.by_category.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-8">No category data available</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                          <th className="text-left pb-2 font-medium">Category</th>
                          <th className="text-right pb-2 font-medium">Products</th>
                          <th className="text-right pb-2 font-medium">Cost Value</th>
                          <th className="text-right pb-2 font-medium">Sale Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportData.by_category.map(cat => (
                          <tr key={cat.category} className="hover:bg-gray-50">
                            <td className="py-2.5 font-medium text-gray-900">{cat.category}</td>
                            <td className="py-2.5 text-right text-gray-500">{cat.products}</td>
                            <td className="py-2.5 text-right text-gray-600">{fmt(cat.cost_value)}</td>
                            <td className="py-2.5 text-right font-semibold text-green-700">{fmt(cat.sale_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 font-bold text-gray-900">
                          <td className="pt-2.5">Total</td>
                          <td className="pt-2.5 text-right">{reportData.summary?.total_products}</td>
                          <td className="pt-2.5 text-right">{fmt(reportData.summary?.total_cost_value)}</td>
                          <td className="pt-2.5 text-right text-green-700">{fmt(reportData.summary?.total_sale_value)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}

              {/* ── All Items tab ── */}
              {reportTab === 'items' && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase">
                      <th className="text-left pb-2 font-medium">Product</th>
                      <th className="text-right pb-2 font-medium">Qty</th>
                      <th className="text-right pb-2 font-medium">Min</th>
                      <th className="text-right pb-2 font-medium">Cost Val</th>
                      <th className="text-right pb-2 font-medium">Sale Val</th>
                      <th className="text-left pb-2 font-medium pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportData.items || []).map(item => {
                      const qty = parseFloat(item.quantity);
                      const min = parseFloat(item.min_stock_level);
                      const s = getStatus(qty, min);
                      return (
                        <tr key={item.product_id} className={`hover:bg-gray-50 ${s.label === 'Out of Stock' ? 'bg-red-50/30' : s.label === 'Low Stock' ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-2">
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            {item.sku && <p className="text-gray-400 font-mono">{item.sku}</p>}
                          </td>
                          <td className="py-2 text-right font-semibold tabular-nums">{qty % 1 === 0 ? qty : qty.toFixed(2)} {item.unit}</td>
                          <td className="py-2 text-right text-gray-400 tabular-nums">{min > 0 ? min : '—'}</td>
                          <td className="py-2 text-right text-gray-600 tabular-nums">{fmt(qty * parseFloat(item.purchase_price))}</td>
                          <td className="py-2 text-right font-semibold text-green-700 tabular-nums">{fmt(qty * parseFloat(item.selling_price))}</td>
                          <td className="py-2 pl-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* ── Movements tab ── */}
              {reportTab === 'movements' && (
                <div className="space-y-3">
                  {(() => {
                    const allMov = reportData.recent_movements || [];
                    const filtered = allMov.filter(m => {
                      const d = m.created_at ? m.created_at.split('T')[0] : '';
                      if (printFrom && d < printFrom) return false;
                      if (printTo   && d > printTo)   return false;
                      return true;
                    });
                    const fmtDate = (d) => d
                      ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : null;
                    const periodLabel = (printFrom || printTo)
                      ? `${fmtDate(printFrom) || '…'} — ${fmtDate(printTo) || '…'}`
                      : 'Last 30 days';
                    return (
                      <>
                        <p className="text-xs text-gray-400">{periodLabel} — {filtered.length} movement{filtered.length !== 1 ? 's' : ''}</p>
                        {filtered.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-8">No stock movements in this period</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 text-gray-500 uppercase">
                                <th className="text-left pb-2 font-medium">Product</th>
                                <th className="text-left pb-2 font-medium">Type</th>
                                <th className="text-right pb-2 font-medium">Qty</th>
                                <th className="text-left pb-2 font-medium">Notes</th>
                                <th className="text-right pb-2 font-medium">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {filtered.map((m, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-2">
                                    <p className="font-medium text-gray-900">{m.product_name}</p>
                                    {m.sku && <p className="text-gray-400 font-mono">{m.sku}</p>}
                                  </td>
                                  <td className="py-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${
                                      m.type === 'in' ? 'bg-green-100 text-green-700' :
                                      m.type === 'out' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-600'}`}>
                                      {m.type === 'in' ? '↑' : m.type === 'out' ? '↓' : '~'} {m.type}
                                    </span>
                                  </td>
                                  <td className="py-2 text-right font-semibold tabular-nums">{parseFloat(m.quantity)}</td>
                                  <td className="py-2 text-gray-400 max-w-[120px] truncate">{m.notes || '—'}</td>
                                  <td className="py-2 text-right text-gray-400 tabular-nums whitespace-nowrap">
                                    {new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
