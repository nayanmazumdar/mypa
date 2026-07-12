import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HiOutlinePlus, HiOutlineEye, HiOutlineMagnifyingGlass, HiOutlineXMark,
  HiOutlineShoppingCart, HiOutlineArrowPath, HiOutlineTrash, HiOutlineCheckCircle,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { purchaseApi } from '../api/purchase.api';
import { supplierApi } from '../api/supplier.api';
import { productApi } from '../api/product.api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const INITIAL_FORM = {
  supplier_id: '',
  items: [],
  discount: 0,
  tax_amount: 0,
  payment_method: 'cash',
  payment_status: 'unpaid',
  paid_amount: 0,
  notes: '',
};

const PAYMENT_STATUS_COLORS = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
};

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Purchase() {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);

  const [purchases, setPurchases]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(INITIAL_FORM);
  const [saving, setSaving]         = useState(false);
  const [suppliers, setSuppliers]   = useState([]);
  const [products, setProducts]     = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingProducts, setLoadingProducts]   = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loadingDetail, setLoadingDetail]       = useState(false);
  const [clearingDue, setClearingDue]           = useState(null);

  const debounceRef = useRef(null);

  // ── load purchases ────────────────────────────────────────────
  const load = useCallback(async (pg = 1, q = '', from = '', to = '') => {
    setLoading(true);
    try {
      const res = await purchaseApi.getAll({
        page: pg, limit: 20,
        ...(q    && { search: q }),
        ...(from && { start_date: from }),
        ...(to   && { end_date: to }),
      });
      setPurchases(res.data || []);
      setPagination(res.pagination || null);
    } catch {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setDateFrom('');
    setDateTo('');
    load(1, '', '', '');
  }, [location.key, load]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, value, dateFrom, dateTo), 400);
  };

  const handleDateFilter = (from, to) => {
    setPage(1);
    load(1, search, from, to);
  };

  // ── load suppliers & products for modal ───────────────────────
  const loadSuppliers = async () => {
    if (suppliers.length > 0) return;
    setLoadingSuppliers(true);
    try {
      const res = await supplierApi.getAll({ limit: 200 });
      setSuppliers(res.data || []);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadProducts = async () => {
    if (products.length > 0) return;
    setLoadingProducts(true);
    try {
      const res = await productApi.getAll({ limit: 500 });
      setProducts(res.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const openCreate = async () => {
    setForm(INITIAL_FORM);
    setShowModal(true);
    await Promise.all([loadSuppliers(), loadProducts()]);
  };

  // ── items helpers ─────────────────────────────────────────────
  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { product_id: '', manual_name: '', quantity: 1, unit_price: 0, is_manual: false }],
    }));
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const toggleManual = (idx) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], is_manual: !items[idx].is_manual, product_id: '', manual_name: '', unit_price: 0 };
      return { ...f, items };
    });
  };

  const updateItem = (idx, key, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      // auto-fill unit price from product
      if (key === 'product_id' && !items[idx].is_manual) {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod) items[idx].unit_price = parseFloat(prod.purchase_price || prod.selling_price || 0);
      }
      return { ...f, items };
    });
  };

  // ── computed totals ───────────────────────────────────────────
  const subTotal = form.items.reduce((sum, it) =>
    sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0);
  const netTotal = subTotal - (parseFloat(form.discount) || 0) + (parseFloat(form.tax_amount) || 0);

  // ── submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) { toast.error('Add at least one item'); return; }
    const invalid = form.items.find(it => 
      (!it.is_manual && !it.product_id) || 
      (it.is_manual && !it.manual_name.trim()) || 
      !it.quantity || 
      it.unit_price < 0
    );
    if (invalid) { toast.error('All items must have a product/name, quantity and price'); return; }

    setSaving(true);
    try {
      await purchaseApi.create({
        ...form,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        items: form.items.map(it => ({
          product_id: it.is_manual ? null : parseInt(it.product_id),
          manual_name: it.is_manual ? it.manual_name : null,
          quantity: parseFloat(it.quantity),
          unit_price: parseFloat(it.unit_price),
        })),
        discount:    parseFloat(form.discount)    || 0,
        tax_amount:  parseFloat(form.tax_amount)  || 0,
        paid_amount: parseFloat(form.paid_amount) || 0,
      });
      toast.success('Purchase recorded & stock updated');
      setShowModal(false);
      load(page, search);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  // ── view detail ───────────────────────────────────────────────
  const viewDetail = async (p) => {
    setSelectedPurchase(null);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await purchaseApi.getById(p.id);
      setSelectedPurchase(res.data || res);
    } catch {
      toast.error('Failed to load purchase details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── clear due ─────────────────────────────────────────────────
  const handleClearDue = async (p) => {
    if (!confirm(`Clear the due amount of ${fmt(p.due_amount)} for invoice ${p.invoice_number}?\n\nThis will mark it as fully paid.`)) return;
    setClearingDue(p.id);
    try {
      await purchaseApi.clearDue(p.id);
      toast.success('Due amount cleared & marked as paid');
      load(page, search);
      if (showDetailModal && selectedPurchase?.id === p.id) {
        const res = await purchaseApi.getById(p.id);
        setSelectedPurchase(res.data || res);
      }
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to clear due');
    } finally {
      setClearingDue(null);
    }
  };

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

  const fmtDate = (d) => {
    if (!d) return '—';
    // Handle MySQL date objects, ISO strings, and plain YYYY-MM-DD
    const raw = typeof d === 'string' ? d : d.toISOString?.() ?? String(d);
    // If already has time component, use as-is; if plain date, add noon to avoid TZ issues
    const parsed = new Date(raw.includes('T') || raw.includes(' ') ? raw : raw + 'T12:00:00');
    if (isNaN(parsed)) return '—';
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ── print single purchase ─────────────────────────────────────
  const printPurchase = async (p) => {
    const shopName  = user?.shop_name || 'MyPA Business';
    const adminName = user?.name      || 'Administrator';
    const logoUrl   = `${window.location.origin}/logo.png`;
    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // fetch full details with items
    let purchase = p;
    try {
      const res = await purchaseApi.getById(p.id);
      purchase = res.data || res;
    } catch { /* use row data as fallback */ }

    const items = purchase.items || [];
    const paymentCls = purchase.payment_status === 'paid'    ? '#15803d' :
                       purchase.payment_status === 'partial' ? '#d97706' : '#dc2626';
    const paymentBg  = purchase.payment_status === 'paid'    ? '#dcfce7' :
                       purchase.payment_status === 'partial' ? '#fef3c7' : '#fee2e2';

    const itemRows = items.map((it, i) => {
      const name  = it.product_name || it.manual_name || '—';
      const qty   = parseFloat(it.quantity  || 0);
      const price = parseFloat(it.unit_price || 0);
      const total = parseFloat(it.total || qty * price);
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${name}</td>
        <td class="center">${qty % 1 === 0 ? qty : qty.toFixed(2)}</td>
        <td class="right">${fmt(price)}</td>
        <td class="right bold">${fmt(total)}</td>
      </tr>`;
    }).join('');

    const w = window.open('', '_blank', 'width=800,height=700');
    if (!w) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }

    w.document.write(`<!DOCTYPE html><html><head>
  <title>Purchase Voucher / Inward Challan — ${purchase.invoice_number}</title>
  <meta charset="utf-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;padding:28px;max-width:720px;margin:0 auto}
    /* ── letterhead ── */
    .letterhead{display:flex;align-items:center;justify-content:space-between;
      border-bottom:3px solid #7c3aed;padding-bottom:14px;margin-bottom:20px}
    .lh-brand{display:flex;align-items:center;gap:12px}
    .lh-brand img{height:40px;width:auto}
    .lh-brand-text .shop{font-size:17px;font-weight:800;color:#111}
    .lh-brand-text .tagline{font-size:10px;color:#9b7fd4;margin-top:1px;font-style:italic}
    .lh-right{text-align:right}
    .lh-right .doc-title{font-size:18px;font-weight:800;color:#7c3aed;letter-spacing:.02em}
    .lh-right .invoice-no{font-size:13px;font-weight:700;color:#374151;margin-top:3px;font-family:'Courier New',monospace}
    .lh-right .doc-meta{font-size:10px;color:#9ca3af;margin-top:2px}
    /* ── info grid ── */
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
    .info-box{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px}
    .info-box .lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
    .info-box .val{font-size:13px;font-weight:600;color:#111}
    .info-box .val.violet{color:#7c3aed}
    .status-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
      background:${paymentBg};color:${paymentCls}}
    /* ── items table ── */
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
      color:#7c3aed;border-left:3px solid #7c3aed;padding-left:8px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#f5f3ff}
    th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
       color:#7c3aed;padding:8px 10px;text-align:left;border-bottom:2px solid #ddd6fe}
    th.center,td.center{text-align:center}
    th.right,td.right{text-align:right}
    td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
    tr:nth-child(even) td{background:#fafafa}
    td.bold{font-weight:700}
    tfoot tr td{background:#f5f3ff;font-weight:700;border-top:2px solid #ddd6fe}
    /* ── totals block ── */
    .totals{margin-top:16px;margin-left:auto;width:260px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
    .totals-row{display:flex;justify-content:space-between;padding:7px 14px;font-size:12px;border-bottom:1px solid #f3f4f6}
    .totals-row:last-child{border-bottom:none;background:#f5f3ff;font-weight:700;font-size:13px}
    .totals-row .t-lbl{color:#6b7280}
    .totals-row .t-val{font-weight:600;color:#111}
    .totals-row.net .t-val{color:#7c3aed;font-size:15px;font-weight:800}
    .totals-row.paid-row .t-val{color:#15803d}
    .totals-row.due-row .t-val{color:#dc2626}
    /* ── payment badge ── */
    .payment-row{display:flex;gap:16px;margin-top:14px;flex-wrap:wrap}
    .p-box{border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:11px}
    .p-box .p-lbl{color:#9ca3af;margin-bottom:2px}
    .p-box .p-val{font-weight:700;color:#374151}
    /* ── notes ── */
    .notes-box{margin-top:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:11px;color:#92400e}
    /* ── signature ── */
    .signature-section{display:flex;justify-content:space-between;align-items:flex-end;
      margin-top:36px;padding-top:14px;border-top:1px dashed #e5e7eb}
    .sig-box{text-align:center;width:180px}
    .sig-line{border-top:1.5px solid #374151;margin-bottom:5px;margin-top:36px}
    .sig-name{font-size:13px;font-weight:700}
    .sig-title{font-size:10px;color:#6b7280;margin-top:2px}
    .cgr{text-align:center;font-size:10px;color:#9ca3af;font-style:italic;margin-top:8px}
    /* ── page footer ── */
    .page-footer{display:flex;align-items:center;justify-content:space-between;
      margin-top:20px;padding-top:10px;border-top:2px solid #7c3aed}
    .pf-brand{display:flex;align-items:center;gap:8px}
    .pf-brand img{height:22px;width:auto}
    .pf-brand-name{font-size:13px;font-weight:800;color:#7c3aed}
    .pf-brand-tag{font-size:9px;color:#9b7fd4;font-style:italic}
    .pf-right{text-align:right;font-size:10px;color:#9ca3af}
    .pf-right .pf-bold{font-size:11px;font-weight:600;color:#374151}
    @media print{body{padding:14px}tr{page-break-inside:avoid}.signature-section{page-break-inside:avoid}}
  </style>
</head><body>

  <!-- letterhead -->
  <div class="letterhead">
    <div class="lh-brand">
      <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'"/>
      <div class="lh-brand-text">
        <div class="shop">${shopName}</div>
        <div class="tagline">Powered by MyPA · Smart Business Management</div>
      </div>
    </div>
    <div class="lh-right">
      <div class="doc-title">Purchase Voucher / Inward Challan</div>
      <div class="invoice-no">${purchase.invoice_number || '—'}</div>
      <div class="doc-meta">Generated: ${now}</div>
      <div class="doc-meta">By: ${adminName}</div>
    </div>
  </div>

  <!-- info grid -->
  <div class="info-grid">
    <div class="info-box">
      <div class="lbl">Supplier</div>
      <div class="val">${purchase.supplier_name || 'Walk-in / No Supplier'}</div>
    </div>
    <div class="info-box">
      <div class="lbl">Purchase Date</div>
      <div class="val">${fmtDate(purchase.purchase_date)}</div>
    </div>
    <div class="info-box">
      <div class="lbl">Payment Status</div>
      <div class="val"><span class="status-pill">${purchase.payment_status?.toUpperCase()}</span></div>
    </div>
    <div class="info-box">
      <div class="lbl">Payment Method</div>
      <div class="val">${(purchase.payment_method || '—').replace('_', ' ').toUpperCase()}</div>
    </div>
  </div>

  <!-- items -->
  <div class="section-title">Items Purchased</div>
  ${items.length === 0
    ? `<p style="color:#9ca3af;font-size:11px;margin-bottom:16px">No item details available</p>`
    : `<table>
    <thead><tr>
      <th class="center" style="width:36px">#</th>
      <th>Item / Product</th>
      <th class="center" style="width:70px">Qty</th>
      <th class="right" style="width:110px">Unit Price</th>
      <th class="right" style="width:110px">Total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr>
      <td colspan="4" class="right">Subtotal</td>
      <td class="right">${fmt(purchase.total_amount)}</td>
    </tr></tfoot>
  </table>`}

  <!-- totals -->
  <div class="totals">
    ${parseFloat(purchase.discount || 0) > 0
      ? `<div class="totals-row"><span class="t-lbl">Subtotal</span><span class="t-val">${fmt(purchase.total_amount)}</span></div>
         <div class="totals-row"><span class="t-lbl">Discount</span><span class="t-val" style="color:#d97706">− ${fmt(purchase.discount)}</span></div>`
      : ''}
    ${parseFloat(purchase.tax_amount || 0) > 0
      ? `<div class="totals-row"><span class="t-lbl">Tax</span><span class="t-val">+ ${fmt(purchase.tax_amount)}</span></div>`
      : ''}
    <div class="totals-row net"><span class="t-lbl">Net Total</span><span class="t-val">${fmt(purchase.net_amount)}</span></div>
    ${parseFloat(purchase.paid_amount || 0) > 0
      ? `<div class="totals-row paid-row"><span class="t-lbl">Amount Paid</span><span class="t-val">${fmt(purchase.paid_amount)}</span></div>`
      : ''}
    ${parseFloat(purchase.due_amount || 0) > 0
      ? `<div class="totals-row due-row"><span class="t-lbl">Due (Udhaar)</span><span class="t-val">${fmt(purchase.due_amount)}</span></div>`
      : ''}
  </div>

  ${purchase.notes ? `<div class="notes-box">📝 <strong>Notes:</strong> ${purchase.notes}</div>` : ''}

  <!-- signature -->
  <div class="signature-section">
    <div style="font-size:10px;color:#9ca3af">
      <div style="font-weight:600;color:#374151;margin-bottom:4px">${shopName}</div>
      <div>Invoice: ${purchase.invoice_number}</div>
      <div>Date: ${fmtDate(purchase.purchase_date)}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">${adminName}</div>
      <div class="sig-title">Authorised Signatory</div>
    </div>
  </div>
  <div class="cgr">💻 Computer Generated Voucher — Does not require manual signature</div>

  <!-- page footer -->
  <div class="page-footer">
    <div class="pf-brand">
      <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'"/>
      <div>
        <div class="pf-brand-name">MyPA</div>
        <div class="pf-brand-tag">Smart Business Management System</div>
      </div>
    </div>
    <div class="pf-right">
      <div>${shopName} · Purchase Voucher</div>
      <div class="pf-bold">${purchase.invoice_number} · ${fmt(purchase.net_amount)}</div>
    </div>
  </div>

</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // ── print report ──────────────────────────────────────────────
  const printReport = async () => {
    if (purchases.length === 0) { toast.error('No purchases to print'); return; }

    const shopName  = user?.shop_name || 'MyPA Business';
    const adminName = user?.name      || 'Administrator';
    const logoUrl   = `${window.location.origin}/logo.png`;
    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const todayFull = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    // ── date range label ──────────────────────────────────────
    const fmtPrintDate = (d) => d
      ? new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;
    const periodFrom = fmtPrintDate(dateFrom);
    const periodTo   = fmtPrintDate(dateTo);
    const periodLabel = periodFrom && periodTo
      ? `${periodFrom} — ${periodTo}`
      : periodFrom
        ? `From ${periodFrom}`
        : periodTo
          ? `Up to ${periodTo}`
          : 'All Time';

    // ── fetch ALL purchases for the active date range ─────────
    let allPurchases = purchases;
    try {
      const res = await purchaseApi.getAll({
        page: 1, limit: 10000,
        ...(search   && { search }),
        ...(dateFrom && { start_date: dateFrom }),
        ...(dateTo   && { end_date: dateTo }),
      });
      allPurchases = res.data || purchases;
    } catch {
      // fall back to whatever is already on screen
    }

    // ── transaction rows ──────────────────────────────────────
    const rows = allPurchases.map((p, idx) => {
      const paymentCls = p.payment_status === 'paid'    ? 'green' :
                         p.payment_status === 'partial' ? 'amber' : 'red';
      const date = fmtDate(p.purchase_date);
      return `<tr>
        <td class="center">${idx + 1}</td>
        <td class="mono">${p.invoice_number || '—'}</td>
        <td>${p.supplier_name || '<em style="color:#9ca3af">No Supplier</em>'}</td>
        <td class="right">${fmt(p.net_amount)}</td>
        <td class="right green-text">${parseFloat(p.paid_amount || 0) > 0 ? fmt(p.paid_amount) : '—'}</td>
        <td class="right red-text">${parseFloat(p.due_amount || 0) > 0 ? fmt(p.due_amount) :
          parseFloat(p.original_due_amount || 0) > 0
            ? `<span style="text-decoration:line-through;color:#d1d5db">${fmt(p.original_due_amount)}</span>`
            : '—'}</td>
        <td class="center"><span class="badge ${paymentCls}">${p.payment_status}</span></td>
        <td class="center">${p.payment_method || '—'}</td>
        <td class="center">${date}</td>
      </tr>`;
    }).join('');

    // ── supplier-wise composite ───────────────────────────────
    const supplierMap = {};
    allPurchases.forEach(p => {
      const key = p.supplier_name || 'No Supplier / Walk-in';
      if (!supplierMap[key]) {
        supplierMap[key] = { orders: 0, total: 0, paid: 0, due: 0, partial: 0, unpaid: 0, fullyPaid: 0 };
      }
      const s = supplierMap[key];
      s.orders++;
      s.total += parseFloat(p.net_amount  || 0);
      s.paid  += parseFloat(p.paid_amount || 0);
      s.due   += parseFloat(p.due_amount  || 0);
      if (p.payment_status === 'paid')    s.fullyPaid++;
      if (p.payment_status === 'partial') s.partial++;
      if (p.payment_status === 'unpaid')  s.unpaid++;
    });

    const supplierRows = Object.entries(supplierMap)
      .sort((a, b) => b[1].due - a[1].due)   // sort by due desc (most owing first)
      .map(([name, s], i) => {
        const statusSummary = [
          s.fullyPaid ? `<span class="badge green">${s.fullyPaid} paid</span>` : '',
          s.partial   ? `<span class="badge amber">${s.partial} partial</span>` : '',
          s.unpaid    ? `<span class="badge red">${s.unpaid} unpaid</span>` : '',
        ].filter(Boolean).join(' ');
        const dueCls = s.due > 0 ? 'red-text bold' : 'muted';
        return `<tr>
          <td class="center">${i + 1}</td>
          <td class="bold">${name}</td>
          <td class="center">${s.orders}</td>
          <td class="right">${fmt(s.total)}</td>
          <td class="right green-text bold">${s.paid > 0 ? fmt(s.paid) : '—'}</td>
          <td class="right ${dueCls}">${s.due > 0 ? fmt(s.due) : '—'}</td>
          <td class="center">${statusSummary || '—'}</td>
        </tr>`;
      }).join('');

    const supplierTotalPaid = Object.values(supplierMap).reduce((s, v) => s + v.paid, 0);
    const supplierTotalDue  = Object.values(supplierMap).reduce((s, v) => s + v.due, 0);
    const supplierTotalVal  = Object.values(supplierMap).reduce((s, v) => s + v.total, 0);

    const w = window.open('', '_blank', 'width=1150,height=850');
    if (!w) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }

    w.document.write(`<!DOCTYPE html><html><head>
  <title>Purchase Report / Inward Challan — ${shopName}</title><meta charset="utf-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;padding:28px}
    .letterhead{display:flex;align-items:center;justify-content:space-between;
      border-bottom:3px solid #7c3aed;padding-bottom:14px;margin-bottom:16px}
    .lh-brand{display:flex;align-items:center;gap:12px}
    .lh-brand img{height:40px;width:auto}
    .lh-brand-text .shop{font-size:17px;font-weight:800;color:#111}
    .lh-brand-text .tagline{font-size:10px;color:#9b7fd4;margin-top:1px;font-style:italic}
    .lh-right{text-align:right}
    .lh-right .report-title{font-size:15px;font-weight:700;color:#7c3aed}
    .lh-right .report-meta{font-size:10px;color:#9ca3af;margin-top:3px}
    h2{font-size:12px;font-weight:700;margin:22px 0 8px;color:#374151;
       border-left:3px solid #7c3aed;padding-left:8px;text-transform:uppercase;letter-spacing:.04em}
    .meta{font-size:11px;color:#6b7280;margin-bottom:8px}
    .summary{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}
    .s-box{border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;min-width:105px}
    .s-box .lbl{font-size:10px;color:#6b7280}
    .s-box .val{font-size:17px;font-weight:700;margin-top:2px}
    .val.violet{color:#7c3aed}.val.green{color:#15803d}.val.red{color:#dc2626}.val.amber{color:#d97706}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#f5f3ff}
    th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
       color:#7c3aed;padding:8px 9px;text-align:left;border-bottom:2px solid #ddd6fe}
    th.center,td.center{text-align:center}th.right,td.right{text-align:right}
    td{padding:7px 9px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
    tr:nth-child(even) td{background:#fafafa}
    td.mono{font-family:'Courier New',monospace;font-size:11px}
    td.bold{font-weight:700}td.muted{color:#9ca3af}
    .cleared{text-decoration:line-through;color:#d1d5db;font-size:11px}
    td.green-text{color:#15803d}td.red-text{color:#dc2626}
    td.red-text.bold{color:#dc2626;font-weight:700}
    .badge{display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600}
    .badge.green{background:#dcfce7;color:#15803d}
    .badge.amber{background:#fef3c7;color:#d97706}
    .badge.red{background:#fee2e2;color:#b91c1c}
    tfoot tr td{background:#f5f3ff;font-weight:700;border-top:2px solid #ddd6fe;font-size:12px}
    .supplier-box{border:1px solid #ddd6fe;border-radius:10px;overflow:hidden}
    .supplier-title{background:#f5f3ff;padding:10px 16px;font-size:12px;font-weight:700;
      color:#7c3aed;border-bottom:1px solid #ddd6fe;
      display:flex;justify-content:space-between;align-items:center}
    .supplier-title span{font-size:10px;color:#9ca3af;font-weight:400}
    .signature-section{display:flex;justify-content:space-between;align-items:flex-end;
      margin-top:36px;padding-top:16px;border-top:1px dashed #e5e7eb}
    .sig-box{text-align:center;width:200px}
    .sig-stamp{width:80px;height:80px;border:2px dashed #ddd6fe;border-radius:50%;
      display:flex;align-items:center;justify-content:center;margin:0 auto 8px;
      font-size:9px;color:#c4b5fd;text-align:center;padding:8px}
    .sig-line{border-top:1.5px solid #374151;margin-bottom:5px;margin-top:36px}
    .sig-name{font-size:13px;font-weight:700}
    .sig-title{font-size:10px;color:#6b7280;margin-top:2px}
    .sig-date{font-size:10px;color:#9ca3af;margin-top:2px}
    .cgr{text-align:center;font-size:10px;color:#9ca3af;font-style:italic;
      margin-top:10px;letter-spacing:.02em}
    .page-footer{display:flex;align-items:center;justify-content:space-between;
      margin-top:20px;padding-top:10px;border-top:2px solid #7c3aed}
    .pf-brand{display:flex;align-items:center;gap:8px}
    .pf-brand img{height:22px;width:auto}
    .pf-brand-name{font-size:13px;font-weight:800;color:#7c3aed}
    .pf-brand-tag{font-size:9px;color:#9b7fd4;font-style:italic}
    .pf-right{text-align:right;font-size:10px;color:#9ca3af}
    .pf-right .pf-bold{font-size:11px;font-weight:600;color:#374151}
    @media print{body{padding:14px}tr{page-break-inside:avoid}
      .signature-section{page-break-inside:avoid}}
  </style>
</head><body>

  <div class="letterhead">
    <div class="lh-brand">
      <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'"/>
      <div class="lh-brand-text">
        <div class="shop">${shopName}</div>
        <div class="tagline">Powered by MyPA · Smart Business Management</div>
      </div>
    </div>
    <div class="lh-right">
      <div class="report-title">&#128722; Purchase Report / Inward Challan</div>
      <div class="report-meta">Period: <span style="background:#f5f3ff;color:#7c3aed;font-weight:700;padding:2px 8px;border-radius:999px;font-size:10px;border:1px solid #ddd6fe">${periodLabel}</span></div>
      <div class="report-meta">Generated: ${now}</div>
      <div class="report-meta">Prepared by: ${adminName}</div>
    </div>
  </div>

  <div class="meta">Total purchases shown: ${allPurchases.length} &nbsp;·&nbsp; <strong>Period:</strong> <span style="background:#f5f3ff;color:#7c3aed;font-weight:700;padding:2px 8px;border-radius:999px;font-size:10px;border:1px solid #ddd6fe">${periodLabel}</span></div>
  <div class="summary">
    <div class="s-box"><div class="lbl">Total Purchases</div><div class="val violet">${allPurchases.length}</div></div>
    <div class="s-box"><div class="lbl">Total Value</div><div class="val violet">${fmt(supplierTotalVal)}</div></div>
    <div class="s-box"><div class="lbl">Amount Paid</div><div class="val green">${fmt(supplierTotalPaid)}</div></div>
    <div class="s-box"><div class="lbl">Due (Udhaar)</div><div class="val red">${fmt(supplierTotalDue)}</div></div>
    <div class="s-box"><div class="lbl">Fully Paid</div><div class="val green">${allPurchases.filter(p => p.payment_status === 'paid').length}</div></div>
    <div class="s-box"><div class="lbl">Partial</div><div class="val amber">${allPurchases.filter(p => p.payment_status === 'partial').length}</div></div>
    <div class="s-box"><div class="lbl">Unpaid</div><div class="val red">${allPurchases.filter(p => p.payment_status === 'unpaid').length}</div></div>
  </div>

  <h2>Transaction Details</h2>
  <table>
    <thead><tr>
      <th class="center" style="width:36px">S.No</th>
      <th style="width:110px">Invoice #</th><th>Supplier</th>
      <th class="right" style="width:95px">Net Amount</th>
      <th class="right" style="width:88px">Paid</th>
      <th class="right" style="width:88px">Due</th>
      <th class="center" style="width:72px">Status</th>
      <th class="center" style="width:72px">Method</th>
      <th class="center" style="width:88px">Date</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="3" class="right">Grand Total</td>
      <td class="right">${fmt(supplierTotalVal)}</td>
      <td class="right" style="color:#15803d">${fmt(supplierTotalPaid)}</td>
      <td class="right" style="color:${supplierTotalDue > 0 ? '#dc2626' : '#374151'}">${supplierTotalDue > 0 ? fmt(supplierTotalDue) : '—'}</td>
      <td colspan="3"></td>
    </tr></tfoot>
  </table>

  <h2>Supplier-wise Payment Summary</h2>
  <div class="supplier-box">
    <div class="supplier-title">
      Vendor Payment Breakdown
      <span>${Object.keys(supplierMap).length} supplier${Object.keys(supplierMap).length !== 1 ? 's' : ''} · sorted by outstanding due</span>
    </div>
    <table>
      <thead><tr>
        <th class="center" style="width:36px">#</th><th>Supplier / Vendor</th>
        <th class="center" style="width:68px">Orders</th>
        <th class="right" style="width:100px">Total Value</th>
        <th class="right" style="width:100px">Amount Paid</th>
        <th class="right" style="width:100px">Due (Udhaar)</th>
        <th class="center" style="width:155px">Breakdown</th>
      </tr></thead>
      <tbody>${supplierRows}</tbody>
      <tfoot><tr>
        <td colspan="2" class="right">Total</td>
        <td class="center">${allPurchases.length}</td>
        <td class="right">${fmt(supplierTotalVal)}</td>
        <td class="right" style="color:#15803d">${fmt(supplierTotalPaid)}</td>
        <td class="right" style="color:${supplierTotalDue > 0 ? '#dc2626' : '#374151'}">${fmt(supplierTotalDue)}</td>
        <td></td>
      </tr></tfoot>
    </table>
  </div>

  <div class="signature-section">
    <div><div class="sig-stamp">OFFICE<br/>STAMP</div></div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">${adminName}</div>
      <div class="sig-title">Authorised Signatory</div>
      <div class="sig-date">Date: ${todayFull}</div>
    </div>
  </div>
  <div class="cgr">&#128187; Computer Generated Report — Does not require manual signature</div>

  <div class="page-footer">
    <div class="pf-brand">
      <img src="${logoUrl}" alt="MyPA" onerror="this.style.display='none'"/>
      <div>
        <div class="pf-brand-name">MyPA</div>
        <div class="pf-brand-tag">Smart Business Management System</div>
      </div>
    </div>
    <div class="pf-right">
      <div>${shopName} · Purchase Report / Inward Challan</div>
      <div>Period: <span style="background:#f5f3ff;color:#7c3aed;font-weight:700;padding:1px 7px;border-radius:999px;font-size:9px;border:1px solid #ddd6fe">${periodLabel}</span></div>
      <div>Generated on ${now} by ${adminName}</div>
      <div class="pf-bold">${allPurchases.length} purchases · ${fmt(supplierTotalVal)} total · ${fmt(supplierTotalDue)} due</div>
    </div>
  </div>

</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // ── summary stats ─────────────────────────────────────────────
  const totalSpent   = purchases.reduce((s, p) => s + parseFloat(p.net_amount   || 0), 0);
  const totalPaid    = purchases.reduce((s, p) => s + parseFloat(p.paid_amount  || 0), 0);
  const totalDue     = purchases.reduce((s, p) => s + parseFloat(p.due_amount   || 0), 0);
  const countPaid    = purchases.filter(p => p.payment_status === 'paid').length;
  const countPartial = purchases.filter(p => p.payment_status === 'partial').length;
  const countUnpaid  = purchases.filter(p => p.payment_status === 'unpaid').length;

  if (loading && purchases.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500">
            {pagination?.total ?? purchases.length} purchase{(pagination?.total ?? purchases.length) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(1); load(1, search, dateFrom, dateTo); }}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="Refresh"
          >
            <HiOutlineArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* ── Date range for report ── */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                handleDateFilter(e.target.value, dateTo);
              }}
              className="text-xs text-gray-700 bg-transparent outline-none cursor-pointer"
            />
            <span className="text-xs text-gray-300">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                handleDateFilter(dateFrom, e.target.value);
              }}
              className="text-xs text-gray-700 bg-transparent outline-none cursor-pointer"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); handleDateFilter('', ''); }}
                className="text-gray-300 hover:text-red-400 transition-colors ml-0.5"
                title="Clear dates"
              >
                <HiOutlineXMark className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={printReport}
            disabled={!dateFrom || !dateTo}
            title={!dateFrom || !dateTo ? 'Select a date range to print report' : 'Print purchase report'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <HiOutlinePrinter className="w-4 h-4" /> Print Report
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> New Purchase
          </button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      {purchases.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{pagination?.total ?? purchases.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Value</p>
            <p className="text-lg font-bold text-primary-600">{fmt(totalSpent)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Amount Paid</p>
            <p className="text-lg font-bold text-green-600">{fmt(totalPaid)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{countPaid} fully paid</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Due (Udhaar)</p>
            <p className="text-lg font-bold text-red-500">{fmt(totalDue)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{countUnpaid} unpaid</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Partial</p>
            <p className="text-2xl font-bold text-amber-500">{countPartial}</p>
            <p className="text-xs text-gray-400 mt-0.5">part paid</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Fully Paid</p>
            <p className="text-2xl font-bold text-green-600">{countPaid}</p>
            <p className="text-xs text-gray-400 mt-0.5">cleared</p>
          </div>
        </div>
      )}

      {/* ── Search & Date Filter ───────────────────────────── */}
      <div className="card flex flex-wrap items-center gap-3 py-3">
        <HiOutlineMagnifyingGlass className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by invoice number or supplier…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-[180px] bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        {search && (
          <button onClick={() => handleSearch('')} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        )}

        <div className="h-4 w-px bg-gray-200 shrink-0 hidden sm:block" />

        <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
          <span className="text-xs font-medium text-gray-400 hidden sm:inline">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              handleDateFilter(e.target.value, dateTo);
            }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 bg-white"
          />
          <span className="text-xs text-gray-400">–</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              handleDateFilter(dateFrom, e.target.value);
            }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 bg-white"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                handleDateFilter('', '');
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Clear date filter"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Discount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Due</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="12" className="px-4 py-10 text-center">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-16 text-center">
                    <HiOutlineShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      {search ? `No purchases match "${search}"` : 'No purchases recorded yet'}
                    </p>
                    {!search && (
                      <p className="text-gray-400 text-xs mt-1">Click "New Purchase" to record your first purchase</p>
                    )}
                  </td>
                </tr>
              ) : (
                purchases.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-primary-600">{p.invoice_number}</span>
                        <button
                          onClick={() => printPurchase(p)}
                          className="p-1 rounded-md bg-primary-50 text-primary-500 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                          title={`Print voucher for ${p.invoice_number}`}
                        >
                          <HiOutlinePrinter className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.supplier_name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(p.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 text-xs">
                      {parseFloat(p.discount || 0) > 0 ? fmt(p.discount) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(p.net_amount)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium text-xs">
                      {parseFloat(p.paid_amount || 0) > 0 ? fmt(p.paid_amount) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {parseFloat(p.due_amount || 0) > 0 ? (
                        <span className="text-red-600 font-semibold">{fmt(p.due_amount)}</span>
                      ) : parseFloat(p.original_due_amount || 0) > 0 ? (
                        <span className="text-gray-300 line-through text-xs" title="Due cleared">
                          {fmt(p.original_due_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[p.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtDate(p.purchase_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => viewDetail(p)}
                          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="View details"
                        >
                          <HiOutlineEye className="w-4 h-4" />
                        </button>
                        {(p.payment_status === 'unpaid' || p.payment_status === 'partial') && parseFloat(p.due_amount) > 0 && (
                          <button
                            onClick={() => handleClearDue(p)}
                            disabled={clearingDue === p.id}
                            title="Clear due amount"
                            className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                          >
                            {clearingDue === p.id
                              ? <span className="inline-block w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                              : <HiOutlineCheckCircle className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1}
                onClick={() => { const p = page - 1; setPage(p); load(p, search, dateFrom, dateTo); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors">
                ← Prev
              </button>
              <button disabled={pagination.page >= pagination.totalPages}
                onClick={() => { const p = page + 1; setPage(p); load(p, search, dateFrom, dateTo); }}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── New Purchase Modal ──────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Purchase"
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              className="input-field"
              value={form.supplier_id}
              onChange={(e) => setForm(f => ({ ...f, supplier_id: e.target.value }))}
              disabled={loadingSuppliers}
            >
              <option value="">{loadingSuppliers ? 'Loading…' : '— Walk-in / No Supplier —'}</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.company ? ` (${s.company})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items <span className="text-red-500">*</span></label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            {form.items.length === 0 ? (
              <div
                onClick={addItem}
                className="border-2 border-dashed border-gray-200 rounded-lg py-6 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <HiOutlineShoppingCart className="w-7 h-7 text-gray-300 mx-auto mb-1" />
                <p className="text-sm text-gray-400">Click to add first item</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-5 text-xs text-gray-500 font-medium">Product / Item</span>
                  <span className="col-span-2 text-xs text-gray-500 font-medium text-center">Qty</span>
                  <span className="col-span-2 text-xs text-gray-500 font-medium text-right">Unit Price</span>
                  <span className="col-span-2 text-xs text-gray-500 font-medium text-right">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {form.items.map((item, idx) => {
                  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                  return (
                    <div key={idx} className="bg-gray-50 rounded-lg px-2 py-2 space-y-1.5">
                      {/* Mode toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleManual(idx)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            !item.is_manual
                              ? 'bg-primary-100 text-primary-700 border-primary-300'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          From catalogue
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleManual(idx)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            item.is_manual
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Manual entry
                        </button>
                      </div>

                      {/* Fields row */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        {/* Product or Manual name */}
                        <div className="col-span-5">
                          {item.is_manual ? (
                            <input
                              type="text"
                              className="input-field text-xs py-1.5"
                              placeholder="Item name…"
                              value={item.manual_name}
                              onChange={(e) => updateItem(idx, 'manual_name', e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <select
                              className="input-field text-xs py-1.5"
                              value={item.product_id}
                              onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                              disabled={loadingProducts}
                            >
                              <option value="">{loadingProducts ? 'Loading…' : '— Select product —'}</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {/* Qty */}
                        <div className="col-span-2">
                          <input
                            type="number" min="0.01" step="0.01"
                            className="input-field text-xs py-1.5 text-center"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          />
                        </div>
                        {/* Unit Price */}
                        <div className="col-span-2">
                          <input
                            type="number" min="0" step="0.01"
                            className="input-field text-xs py-1.5 text-right"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          />
                        </div>
                        {/* Line total */}
                        <div className="col-span-2 text-xs font-semibold text-right text-gray-700">
                          {fmt(lineTotal)}
                        </div>
                        {/* Remove */}
                        <div className="col-span-1 flex justify-end">
                          <button type="button" onClick={() => removeItem(idx)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Discount, Tax, Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
              <input type="number" min="0" step="0.01" className="input-field"
                value={form.discount}
                onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax (₹)</label>
              <input type="number" min="0" step="0.01" className="input-field"
                value={form.tax_amount}
                onChange={(e) => setForm(f => ({ ...f, tax_amount: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select className="input-field"
                value={form.payment_method}
                onChange={(e) => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select className="input-field"
                value={form.payment_status}
                onChange={(e) => setForm(f => ({ ...f, payment_status: e.target.value, paid_amount: 0 }))}>
                <option value="unpaid">Unpaid (Full Udhaar)</option>
                <option value="partial">Partial (Paid + Udhaar)</option>
                <option value="paid">Paid (Full Payment)</option>
              </select>
            </div>
          </div>

          {/* Partial payment breakdown */}
          {form.payment_status === 'partial' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                ⚡ Partial Payment — enter how much was paid now
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Paid Now ({form.payment_method}) ₹
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    className="input-field"
                    placeholder="0.00"
                    value={form.paid_amount}
                    max={netTotal}
                    onChange={(e) => setForm(f => ({ ...f, paid_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Udhaar (Due) ₹
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="input-field bg-gray-100 text-red-600 font-semibold cursor-not-allowed"
                    value={Math.max(0, netTotal - (parseFloat(form.paid_amount) || 0)).toFixed(2)}
                  />
                </div>
              </div>
              {parseFloat(form.paid_amount) > netTotal && (
                <p className="text-xs text-red-600">⚠ Paid amount cannot exceed net total ({fmt(netTotal)})</p>
              )}
            </div>
          )}

          {/* Full payment info */}
          {form.payment_status === 'paid' && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-medium">
              ✓ Full payment of {fmt(netTotal)} via {form.payment_method}. No udhaar.
            </div>
          )}

          {/* Unpaid info */}
          {form.payment_status === 'unpaid' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700 font-medium">
              ⚠ Full amount {fmt(netTotal)} is udhaar. No payment now.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" className="input-field" placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Totals summary */}
          {form.items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 border border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{fmt(subTotal)}</span>
              </div>
              {parseFloat(form.discount) > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Discount</span>
                  <span>− {fmt(form.discount)}</span>
                </div>
              )}
              {parseFloat(form.tax_amount) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>+ {fmt(form.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Net Total</span>
                <span className="text-primary-600">{fmt(netTotal)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 min-w-[140px]">
              {saving ? 'Saving…' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Purchase Detail Modal ───────────────────────────── */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Purchase — ${selectedPurchase?.invoice_number || '…'}`}
      >
        {loadingDetail ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : selectedPurchase ? (
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Supplier</p>
                <p className="font-medium">{selectedPurchase.supplier_name || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Date</p>
                <p className="font-medium">{fmtDate(selectedPurchase.purchase_date)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[selectedPurchase.payment_status]}`}>
                    {selectedPurchase.payment_status}
                  </span>
                  <span className="text-gray-500 text-xs capitalize">{selectedPurchase.payment_method}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedPurchase.status]}`}>
                  {selectedPurchase.status}
                </span>
              </div>
            </div>

            {/* Items table */}
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Product</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(selectedPurchase.items || []).map((it, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{it.product_name}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{parseFloat(it.quantity)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(it.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(selectedPurchase.total_amount)}</span>
              </div>
              {parseFloat(selectedPurchase.discount || 0) > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Discount</span>
                  <span>− {fmt(selectedPurchase.discount)}</span>
                </div>
              )}
              {parseFloat(selectedPurchase.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>+ {fmt(selectedPurchase.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-200">
                <span>Net Total</span>
                <span className="text-primary-600">{fmt(selectedPurchase.net_amount)}</span>
              </div>
              {/* Paid / Due breakdown */}
              {selectedPurchase.payment_status === 'partial' && (
                <>
                  <div className="flex justify-between text-sm text-green-700 pt-1">
                    <span>Paid ({selectedPurchase.payment_method})</span>
                    <span className="font-semibold">{fmt(selectedPurchase.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Udhaar (Due)</span>
                    <span className="font-semibold">{fmt(selectedPurchase.due_amount)}</span>
                  </div>
                </>
              )}
              {selectedPurchase.payment_status === 'unpaid' && (
                <div className="flex justify-between text-sm text-red-600 pt-1">
                  <span>Due (Udhaar)</span>
                  <span className="font-semibold">{fmt(selectedPurchase.due_amount)}</span>
                </div>
              )}
              {selectedPurchase.payment_status === 'paid' && (
                <div className="flex justify-between text-sm text-green-600 pt-1">
                  <span>Paid ({selectedPurchase.payment_method})</span>
                  <span className="font-semibold">{fmt(selectedPurchase.paid_amount)}</span>
                </div>
              )}
              {selectedPurchase.payment_status === 'paid' && parseFloat(selectedPurchase.original_due_amount || 0) > 0 && (
                <div className="flex justify-between text-xs text-gray-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    ✓ Udhaar cleared
                  </span>
                  <span className="line-through">{fmt(selectedPurchase.original_due_amount)}</span>
                </div>
              )}
            </div>

            {selectedPurchase.notes && (
              <p className="text-sm text-gray-500 italic">📝 {selectedPurchase.notes}</p>
            )}

            {/* Clear Due button in detail modal */}
            {(selectedPurchase.payment_status === 'unpaid' || selectedPurchase.payment_status === 'partial') && parseFloat(selectedPurchase.due_amount) > 0 && (
              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => handleClearDue(selectedPurchase)}
                  disabled={clearingDue === selectedPurchase.id}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {clearingDue === selectedPurchase.id
                    ? <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    : <HiOutlineCheckCircle className="w-4 h-4" />}
                  Clear Due — {fmt(selectedPurchase.due_amount)}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

    </div>
  );
}
