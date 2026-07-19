import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineScale, HiOutlinePrinter, HiOutlineTrash, HiOutlineMinus,
  HiOutlinePlus, HiOutlineQrCode, HiOutlineUser, HiOutlineMagnifyingGlass,
  HiOutlineShoppingCart, HiOutlineXMark, HiOutlineReceiptPercent,
  HiOutlineClock, HiOutlineChartBar, HiOutlinePause, HiOutlinePlay,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import { posApi } from '../api/pos.api';
import * as offlinePos from '../api/offlinePos.api';
import api from '../api/axios';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNetwork } from '../hooks/useNetwork';

// ─── Hold/Park Bills Utility ─────────────────────────────────────
const HELD_BILLS_KEY = 'mypa_held_bills';

function getHeldBills() {
  try { return JSON.parse(localStorage.getItem(HELD_BILLS_KEY) || '[]'); }
  catch { return []; }
}

function saveHeldBills(bills) {
  localStorage.setItem(HELD_BILLS_KEY, JSON.stringify(bills));
}

export default function POS() {
  usePageTitle('Point of Sale');
  const { isOnline, pendingCount, isSyncing, triggerSync } = useNetwork();

  // Product state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsPagination, setProductsPagination] = useState(null);
  const [productsPage, setProductsPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  // Hardware state
  const [scaleWeight, setScaleWeight] = useState(0);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  // Customer state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCredit, setIsCredit] = useState(false);

  // Hold/Park state
  const [heldBills, setHeldBills] = useState(getHeldBills());
  const [showHeldPanel, setShowHeldPanel] = useState(false);

  // Shop info for receipt
  const [shopInfo, setShopInfo] = useState({ name: '', address: '', phone: '', gst_number: '' });

  // Refs
  const customerSearchTimer = useRef(null);
  const barcodeRef = useRef(null);
  const scalePort = useRef(null);
  const scaleReader = useRef(null);
  const searchInputRef = useRef(null);

  // ─── Load Products ────────────────────────────────────────────
  useEffect(() => { loadProducts(); }, [productsPage]);

  // If cache is empty on mount, trigger a sync from server
  useEffect(() => {
    async function initCache() {
      const { getCachedProducts } = await import('../utils/offlineDb');
      const cached = await getCachedProducts();
      if (cached.length === 0 && navigator.onLine) {
        const { syncDataFromServer } = await import('../utils/syncService');
        await syncDataFromServer();
        loadProducts(); // reload after sync
      }
    }
    initCache();
  }, []);

  // Reset page and reload when search/category changes
  useEffect(() => {
    if (productsPage === 1) {
      loadProducts();
    } else {
      setProductsPage(1); // this will trigger the above effect
    }
  }, [search, categoryFilter]);

  // Load categories once
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await offlinePos.getCategories();
        const data = res.data || res || [];
        if (Array.isArray(data) && data.length > 0) setCategories(data.map(c => ({ id: c.id, name: c.name })));
      } catch {}
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadShopInfo = async () => {
      try {
        const res = await api.get('/auth/profile');
        const profile = res.data || res;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const shop = (profile.shops || []).find(s => s.id === user.shop_id) || {};
        setShopInfo({ name: shop.name || user.shop_name || 'My Shop', address: shop.address || '', phone: shop.phone || '', gst_number: shop.gst_number || '' });
      } catch { /* use defaults */ }
    };
    loadShopInfo();
  }, []);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const params = { page: productsPage, limit: 50 };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category_id = categoryFilter;
      const response = await offlinePos.getProducts(params);
      // response = { success, data: [...products], pagination: {...} }
      const data = response.data || [];
      setProducts(Array.isArray(data) ? data : []);
      setProductsPagination(response.pagination || null);
    } catch (err) {
      // Only show error if cache is completely empty
      if (!products || products.length === 0) {
        toast('No products cached. Please sync when online.', { icon: '📡' });
      }
    }
    finally { setProductsLoading(false); }
  };

  // ─── Customer Search ──────────────────────────────────────────
  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);
    if (selectedCustomer) setSelectedCustomer(null);
    clearTimeout(customerSearchTimer.current);
    if (value.length < 2) { setCustomerResults([]); setShowCustomerDropdown(false); return; }
    setShowCustomerDropdown(true); // keep dropdown open while searching
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await offlinePos.searchCustomers(value);
        const data = res.data || res || [];
        const results = Array.isArray(data) ? data : [];
        setCustomerResults(results);
        if (results.length === 0) setShowCustomerDropdown(false);
      } catch { setCustomerResults([]); setShowCustomerDropdown(false); }
    }, 350);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  };
  const clearCustomer = () => { setSelectedCustomer(null); setCustomerSearch(''); setIsCredit(false); setCustomerResults([]); setShowCustomerDropdown(false); };

  // ─── Add New Customer from POS ────────────────────────────────
  const detectInputType = (value) => {
    const v = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
    if (/^[+\d][\d\s\-()+]*$/.test(v) && v.replace(/\D/g, '').length >= 4) return 'phone';
    return 'name';
  };

  const handleAddNewCustomer = async () => {
    const raw = customerSearch.trim();
    if (!raw) return;
    setShowCustomerDropdown(false);
    const type = detectInputType(raw);
    const payload = { name: raw };
    if (type === 'email') { payload.email = raw; payload.name = raw.split('@')[0]; }
    else if (type === 'phone') { payload.phone = raw; }
    try {
      const res = await api.post('/customers', payload);
      const created = res.data || res;
      const newCustomer = { id: created.id, name: created.name, phone: created.phone ?? null, email: created.email ?? null, balance: 0 };
      setSelectedCustomer(newCustomer);
      setCustomerSearch(created.name);
      setCustomerResults([]);
      toast.success(`Customer added: ${created.name}`);
    } catch {
      toast.error('Failed to add customer');
    }
  };

  // ─── Barcode Scanner ──────────────────────────────────────────
  // USB/Bluetooth barcode scanners emulate keyboard input ending with Enter.
  // We buffer rapid keystrokes (within 50ms each) and on Enter, treat as barcode.
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in a search/form input (except dedicated barcode field)
      const tag = e.target.tagName;
      const isFormInput = (tag === 'INPUT' || tag === 'TEXTAREA') && e.target !== barcodeRef.current;
      if (isFormInput) return;

      const now = Date.now();

      if (e.key === 'Enter') {
        e.preventDefault();
        if (buffer.length >= 3) {
          handleBarcodeScan(buffer);
        }
        buffer = '';
        setBarcodeInput('');
        return;
      }

      // Only single printable characters from scanner
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If more than 300ms since last key, start fresh buffer (user typing vs scanner)
        if (now - lastKeyTime > 300) {
          buffer = '';
        }
        buffer += e.key;
        lastKeyTime = now;
        setBarcodeInput(buffer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeScan = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const response = await offlinePos.lookupBarcode(trimmed);
      const product = response.data || response;
      addToCart(product);
      toast.success(`Scanned: ${product.name}`, { icon: '📦', duration: 2000 });
    } catch {
      toast.error(`Product not found: ${trimmed}`, { icon: '❌' });
    }
  };

  // Manual barcode input submit (for the text field)
  const handleBarcodeSubmit = (e) => { e.preventDefault(); if (barcodeInput.trim().length >= 3) { handleBarcodeScan(barcodeInput.trim()); setBarcodeInput(''); } };

  // ─── Scale ────────────────────────────────────────────────────
  const connectScale = async () => {
    if (!('serial' in navigator)) { toast.error('Web Serial not supported. Use Chrome.'); return; }
    try { const port = await navigator.serial.requestPort(); await port.open({ baudRate: 9600 }); scalePort.current = port; setScaleConnected(true); toast.success('Scale connected!'); readScale(port); }
    catch (err) { if (err.name !== 'NotFoundError') toast.error('Failed to connect scale'); }
  };
  const readScale = async (port) => { const reader = port.readable.getReader(); scaleReader.current = reader; let buffer = ''; try { while (true) { const { value, done } = await reader.read(); if (done) break; buffer += new TextDecoder().decode(value); const lines = buffer.split(/[\r\n]+/); buffer = lines.pop() || ''; for (const line of lines) { const w = parseFloat(line.replace(/[^0-9.]/g, '')); if (!isNaN(w) && w >= 0 && w < 100) setScaleWeight(w); } } } catch {} };
  const disconnectScale = async () => { try { if (scaleReader.current) await scaleReader.current.cancel(); if (scalePort.current) await scalePort.current.close(); } catch {} scalePort.current = null; scaleReader.current = null; setScaleConnected(false); setScaleWeight(0); };

  // ─── Cart Management ──────────────────────────────────────────
  const addToCart = useCallback((product) => {
    const quantity = product.unit === 'kg' && scaleWeight > 0 ? scaleWeight : 1;
    const price = product.offer_price ? parseFloat(product.offer_price) : parseFloat(product.selling_price);
    const stock = parseFloat(product.stock) || 0;

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product_id === product.id);
      if (idx >= 0 && product.unit !== 'kg') {
        const currentQty = prev[idx].quantity;
        if (stock > 0 && currentQty + 1 > stock) {
          toast.error(`Only ${stock} in stock`, { id: 'stock-limit-' + product.id, duration: 2000 });
          return prev;
        }
        return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
      }
      if (stock <= 0 && product.unit !== 'kg') {
        toast.error('Out of stock', { id: 'oos-' + product.id, duration: 2000 });
        return prev;
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity, unit: product.unit || 'piece', unit_price: price, original_price: parseFloat(product.selling_price), has_offer: !!product.offer_price, stock }];
    });
    if (product.unit === 'kg' && scaleWeight > 0) toast.success(`${product.name}: ${scaleWeight.toFixed(3)}kg`);
  }, [scaleWeight]);

  const updateCartQuantity = (index, delta) => {
    setCart((prev) => { const updated = [...prev]; const newQty = updated[index].quantity + delta; if (newQty <= 0) return prev.filter((_, i) => i !== index); updated[index] = { ...updated[index], quantity: Math.round(newQty * 1000) / 1000 }; return updated; });
  };
  const removeFromCart = (index) => setCart((prev) => prev.filter((_, i) => i !== index));
  const clearCart = () => { setCart([]); setDiscount(''); setAmountReceived(''); setCustomerSearch(''); setSelectedCustomer(null); setIsCredit(false); setShowCheckout(false); };

  // ─── Hold / Park Bill ─────────────────────────────────────────
  const holdBill = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    const bill = { id: Date.now(), items: cart, customer: selectedCustomer, customerSearch, discount, timestamp: new Date().toISOString(), label: selectedCustomer?.name || customerSearch || `Bill #${heldBills.length + 1}` };
    const updated = [...heldBills, bill];
    setHeldBills(updated);
    saveHeldBills(updated);
    toast.success(`Bill parked: ${bill.label}`);
    clearCart();
  };

  const resumeBill = (bill) => {
    // If there's an active cart, park it first
    if (cart.length > 0) {
      const currentBill = { id: Date.now(), items: cart, customer: selectedCustomer, customerSearch, discount, timestamp: new Date().toISOString(), label: selectedCustomer?.name || customerSearch || `Bill #${heldBills.length + 1}` };
      const updatedHeld = [...heldBills.filter(b => b.id !== bill.id), currentBill];
      setHeldBills(updatedHeld);
      saveHeldBills(updatedHeld);
    } else {
      const updatedHeld = heldBills.filter(b => b.id !== bill.id);
      setHeldBills(updatedHeld);
      saveHeldBills(updatedHeld);
    }
    // Restore the held bill
    setCart(bill.items);
    setSelectedCustomer(bill.customer || null);
    setCustomerSearch(bill.customerSearch || '');
    setDiscount(bill.discount || '');
    setShowCheckout(false);
    setShowHeldPanel(false);
    toast.success(`Resumed: ${bill.label}`);
  };

  const deleteHeldBill = (billId) => {
    const updated = heldBills.filter(b => b.id !== billId);
    setHeldBills(updated);
    saveHeldBills(updated);
    toast.success('Held bill removed');
  };

  // ─── Totals ───────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const change = (parseFloat(amountReceived) || 0) - total;

  // ─── Checkout ─────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (isCredit && !selectedCustomer) { toast.error('Select a customer for credit sale'); return; }
    if (paymentMethod === 'cash' && !isCredit) { const received = parseFloat(amountReceived) || 0; if (received > 0 && received < total) { toast.error('Amount received is less than total'); return; } }
    setLoading(true);
    try {
      const checkoutData = {
        items: cart.map(({ product_id, product_name, quantity, unit, unit_price }) => ({ product_id, product_name, quantity, unit, unit_price })),
        customer_name: selectedCustomer?.name || customerSearch || undefined,
        customer_id: selectedCustomer?.id || undefined,
        discount: discountAmount || undefined,
        payment_method: isCredit ? 'credit' : paymentMethod,
        amount_received: isCredit ? 0 : (parseFloat(amountReceived) || total),
      };
      const response = await offlinePos.checkout(checkoutData);
      const receiptData = response.data || response;
      setLastReceipt(receiptData);
      toast.success(`Sale recorded! ${receiptData.receipt_number}`, { duration: 2000 });
      clearCart(); setPaymentMethod('cash'); loadProducts();
    } catch (err) {
      const msg = err.structured?.message || err.response?.data?.message || err.message || 'Checkout failed. Please try again.';
      toast.error(msg);
    }
    finally { setLoading(false); }
  };

  // ─── Print Receipt ────────────────────────────────────────────
  const printReceipt = async (receipt) => {
    let data = receipt || lastReceipt;
    if (!data) return;

    // If items are missing, fetch the full transaction first
    if (!data.items || data.items.length === 0) {
      if (data.id) {
        try {
          const res = await posApi.getTransaction(data.id);
          data = res.data || res;
        } catch {
          toast.error('Failed to load bill details for printing');
          return;
        }
      } else {
        toast.error('No bill details available');
        return;
      }
    }

    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) { toast.error('Allow pop-ups to print.'); return; }

    const itemsHtml = (data.items || []).map(i => {
      const qty = parseFloat(i.quantity);
      const price = parseFloat(i.unit_price);
      const total = parseFloat(i.total || qty * price);
      const qtyStr = i.unit === 'kg' ? `${qty.toFixed(3)}kg` : `${qty}`;
      return `<div class="item-row"><span class="item-name">${i.product_name}</span></div><div class="row sub"><span>&nbsp;&nbsp;${qtyStr} × ₹${price.toFixed(2)}</span><span>₹${total.toFixed(2)}</span></div>`;
    }).join('');

    const txDate = new Date(data.created_at);
    const dateStr = txDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const totalAmount = parseFloat(data.net_amount || data.total_amount || 0);
    const discAmt = parseFloat(data.discount || 0);
    const subtotalAmt = parseFloat(data.total_amount || totalAmount + discAmt);

    const itemsCount = (data.items || []).length;
    const totalQty = (data.items || []).reduce((s, i) => s + parseFloat(i.quantity), 0);

    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${data.receipt_number}</title>
<style>
@page { margin: 0; size: 80mm auto; }
@media screen { body { max-width: 380px; margin: 0 auto; padding: 16px; } }
@media print { body { width: 72mm; max-width: 72mm; padding: 3mm; } }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; color: #000; }
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #333; margin: 8px 0; }
.double-line { border-top: 2px solid #000; margin: 8px 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; }
.shop-name { font-size: 18px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
.shop-tagline { font-size: 9px; color: #555; margin-top: 2px; letter-spacing: 0.5px; }
.invoice-title { font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 6px 0; }
.invoice-no { font-size: 12px; font-weight: bold; font-family: monospace; }
.meta { font-size: 10px; color: #333; }
.meta b { color: #000; }
table { width: 100%; border-collapse: collapse; margin: 4px 0; }
th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding: 3px 0; text-align: left; }
th.r { text-align: right; }
td { padding: 4px 0; font-size: 11px; vertical-align: top; }
td.r { text-align: right; }
td.item-name { font-weight: 500; }
.totals { margin-top: 4px; }
.totals .row { font-size: 11px; margin: 3px 0; }
.grand-total { font-size: 16px; font-weight: bold; padding: 6px 0; }
.payment-info { font-size: 10px; background: #f5f5f5; padding: 6px 8px; border-radius: 2px; margin-top: 4px; }
.footer { margin-top: 10px; font-size: 9px; color: #555; }
.footer .thanks { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 4px; }
</style></head><body>

<!-- ═══ HEADER ═══════════════════════════════════════════ -->
<div class="center">
  <div class="shop-name">${shopInfo.name || 'My Shop'}</div>
  ${shopInfo.address ? `<div class="meta" style="margin-top:3px">${shopInfo.address}</div>` : ''}
  ${shopInfo.phone || shopInfo.gst_number ? `<div class="meta" style="margin-top:2px">${shopInfo.phone ? `Ph: ${shopInfo.phone}` : ''}${shopInfo.phone && shopInfo.gst_number ? ' | ' : ''}${shopInfo.gst_number ? `GSTIN: ${shopInfo.gst_number}` : ''}</div>` : ''}
</div>

<div class="line"></div>

<!-- ═══ INVOICE INFO ════════════════════════════════════════ -->
<div class="center"><div class="invoice-title">— Tax Invoice —</div></div>
<div class="row meta"><span>Invoice No:</span><span class="invoice-no">${data.receipt_number}</span></div>
<div class="row meta"><span>Date:</span><span><b>${dateStr}</b> at ${timeStr}</span></div>
${data.customer_name ? `<div class="row meta" style="margin-top:3px"><span>Customer:</span><span><b>${data.customer_name}</b></span></div>` : ''}
${data.customer_name && data.customer_phone ? `<div class="row meta"><span>Phone:</span><span>${data.customer_phone}</span></div>` : ''}
${data.biller_name ? `<div class="row meta" style="margin-top:3px"><span>Billed by:</span><span><b>${data.biller_name}</b></span></div>` : ''}

<div class="line"></div>

<!-- ═══ ITEMS TABLE ════════════════════════════════════════ -->
<table>
  <thead>
    <tr><th style="width:45%">Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
  </thead>
  <tbody>
    ${(data.items || []).map((i, idx) => {
      const qty = parseFloat(i.quantity);
      const price = parseFloat(i.unit_price);
      const total = parseFloat(i.total || qty * price);
      const qtyStr = i.unit === 'kg' ? qty.toFixed(3) + 'kg' : String(qty);
      return `<tr><td class="item-name">${idx + 1}. ${i.product_name}</td><td class="r">${qtyStr}</td><td class="r">₹${price.toFixed(2)}</td><td class="r">₹${total.toFixed(2)}</td></tr>`;
    }).join('')}
  </tbody>
</table>

<div class="double-line"></div>

<!-- ═══ TOTALS ═════════════════════════════════════════════ -->
<div class="totals">
  <div class="row"><span>Subtotal (${itemsCount} items, ${totalQty % 1 === 0 ? totalQty : totalQty.toFixed(2)} qty)</span><span>₹${subtotalAmt.toFixed(2)}</span></div>
  ${discAmt > 0 ? `<div class="row"><span>Discount</span><span style="color:#c00">-₹${discAmt.toFixed(2)}</span></div>` : ''}
  ${parseFloat(data.tax_amount || 0) > 0 ? `<div class="row"><span>Tax</span><span>₹${parseFloat(data.tax_amount).toFixed(2)}</span></div>` : ''}
</div>

<div class="double-line"></div>
<div class="row grand-total"><span>TOTAL</span><span>₹${totalAmount.toFixed(2)}</span></div>
<div class="double-line"></div>

<!-- ═══ PAYMENT INFO ══════════════════════════════════════ -->
<div class="payment-info">
  <div class="row"><span>Payment Mode:</span><span class="bold">${(data.payment_method || 'cash').toUpperCase()}</span></div>
  ${data.payment_method === 'cash' || !data.payment_method ? `<div class="row"><span>Amount Received:</span><span>₹${parseFloat(data.amount_received || totalAmount).toFixed(2)}</span></div>` : ''}
  ${parseFloat(data.change_amount || 0) > 0 ? `<div class="row"><span>Change Returned:</span><span>₹${parseFloat(data.change_amount).toFixed(2)}</span></div>` : ''}
  <div class="row"><span>Status:</span><span class="bold">${data.payment_status === 'paid' || !data.payment_status ? 'PAID' : data.payment_status.toUpperCase()}</span></div>
</div>

<div class="line"></div>

<!-- ═══ FOOTER ════════════════════════════════════════════ -->
<div class="center footer">
  <div class="thanks">Thank You For Your Purchase!</div>
  <div>We value your business. Please visit again.</div>
  <div style="margin-top:3px">Exchange/Return within 7 days with this bill.</div>
  <div style="margin-top:6px;font-size:8px;color:#999">Invoice: ${data.receipt_number} | Generated: ${new Date().toLocaleString('en-IN')}</div>
  <div style="margin-top:2px;font-size:8px;color:#aaa">Billing powered by MyPA</div>
</div>

</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  // ─── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'F9') { e.preventDefault(); holdBill(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cart, heldBills, selectedCustomer, customerSearch, discount]);

  // ─── Quick Lookup State ─────────────────────────────────────
  const [quickPanel, setQuickPanel] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const openHistory = async () => {
    if (quickPanel === 'history') { setQuickPanel(null); return; }
    setQuickPanel('history'); setHistoryLoading(true);
    try { const res = await posApi.getTransactions({ limit: 7, biller_id: JSON.parse(localStorage.getItem('user') || '{}').id }); setHistoryData(Array.isArray(res.data || res) ? (res.data || res) : (res.data || res).transactions || []); }
    catch { toast.error('Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const openSummary = async () => {
    if (quickPanel === 'summary') { setQuickPanel(null); return; }
    setQuickPanel('summary'); setSummaryLoading(true);
    try { const res = await posApi.getTodaySummary({ biller_id: JSON.parse(localStorage.getItem('user') || '{}').id }); setSummaryData(res.data || res); }
    catch { toast.error('Failed to load summary'); }
    finally { setSummaryLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex h-[calc(100vh-5rem)] gap-6 -mx-5 sm:-mx-8 lg:-mx-10 -my-8 px-5 sm:px-8 lg:px-10 py-5">
      {/* ═══ LEFT: Product Catalog ═══════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: Search + tools */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input ref={searchInputRef} type="text" placeholder="Search products... (F2)" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 py-2.5 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><HiOutlineXMark className="w-4 h-4" /></button>}
          </div>
          <button onClick={() => { setBarcodeMode(!barcodeMode); setTimeout(() => barcodeRef.current?.focus(), 100); }}
            className={`p-2.5 rounded-xl transition-all ${barcodeMode ? 'text-purple-700' : 'text-gray-500'}`}
            style={barcodeMode ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            title="Barcode Scanner">
            <HiOutlineQrCode className="w-4 h-4" />
          </button>
          <button onClick={scaleConnected ? disconnectScale : connectScale}
            className={`p-2.5 rounded-xl transition-all ${scaleConnected ? 'text-emerald-700' : 'text-gray-500'}`}
            style={scaleConnected ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
            title="Weighing Scale">
            <HiOutlineScale className="w-4 h-4" />
          </button>
        </div>

        {/* Barcode input row */}
        {barcodeMode && (
          <form onSubmit={handleBarcodeSubmit} className="mb-4 flex gap-3">
            <input ref={barcodeRef} type="text" placeholder="Scan or type barcode..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} className="input-field flex-1 font-mono text-sm" autoFocus />
            <button type="submit" className="btn-primary px-4 text-sm">Add</button>
          </form>
        )}

        {/* Scale display */}
        {scaleConnected && (
          <div className="mb-4 px-5 py-3 rounded-2xl flex items-center justify-between" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
            <span className="text-xs text-emerald-700 font-semibold">⚖ Scale Connected</span>
            <span className="text-lg font-bold text-emerald-800 tabular-nums">{scaleWeight.toFixed(3)} kg</span>
          </div>
        )}

        {/* Category filter row */}
        <div className="flex gap-3 mb-4 overflow-x-auto scrollbar-hide py-1">
          <button onClick={() => setCategoryFilter('')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${!categoryFilter ? 'text-primary-700' : 'text-gray-600'}`}
            style={!categoryFilter ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>All Items</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${categoryFilter === cat.id ? 'text-primary-700' : 'text-gray-600'}`}
              style={categoryFilter === cat.id ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>{cat.name}</button>
          ))}
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto rounded-3xl flex flex-col" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          {/* Products count header */}
          {productsPagination && (
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(200,207,216,0.4)', background: 'rgba(200,207,216,0.15)' }}>
              <span className="text-[11px] text-gray-500 font-medium">{productsPagination.total} products{search ? ` matching "${search}"` : ''}</span>
              {productsPagination.totalPages > 1 && <span className="text-[11px] text-gray-400">Page {productsPage} of {productsPagination.totalPages}</span>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(200,207,216,0.2)' }} className="sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Product</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Price</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Stock</th>
                <th className="w-11"></th>
              </tr>
            </thead>
            <tbody>
              {productsLoading && products.length === 0 ? (
                <tr><td colSpan="4" className="py-20 text-center"><div className="w-6 h-6 border-[3px] border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="4" className="py-20 text-center text-gray-400 text-sm">{search ? `No results for "${search}"` : 'No products available'}</td></tr>
              ) : products.map((product) => {
                const inCart = cart.find(c => c.product_id === product.id);
                const outOfStock = parseFloat(product.stock) <= 0;
                return (
                  <tr key={product.id} onClick={() => !outOfStock && addToCart(product)}
                    className={`border-b border-gray-50 last:border-0 transition-colors ${outOfStock ? 'opacity-35 cursor-not-allowed' : 'hover:bg-primary-50/50 cursor-pointer active:bg-primary-100/50'} ${inCart ? 'bg-primary-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url
                          ? <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                          : <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0"><HiOutlineShoppingCart className="w-4 h-4 text-gray-300" /></div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                            {inCart && <span className="flex-shrink-0 min-w-[20px] h-5 bg-primary-600 text-white text-[10px] font-bold rounded-md flex items-center justify-center px-1">{inCart.quantity}</span>}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{product.barcode || product.sku || product.brand || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                      {product.offer_price
                        ? <><span className="font-semibold text-emerald-600">₹{product.offer_price}</span><span className="text-[10px] text-gray-400 line-through ml-1">₹{product.selling_price}</span></>
                        : <span className="font-semibold text-gray-900">₹{product.selling_price}</span>
                      }
                    </td>
                    <td className={`px-3 py-3 text-right text-xs tabular-nums ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {outOfStock ? 'Out' : product.stock}
                    </td>
                    <td className="px-2 py-3">
                      <button onClick={(e) => { e.stopPropagation(); if (!outOfStock) addToCart(product); }} disabled={outOfStock}
                        className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                        <HiOutlinePlus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        {/* Product pagination + Quick actions */}
        <div className="flex items-center justify-between mt-4 gap-4">
          {/* Quick actions (left) */}
          <div className="flex items-center gap-3">
            <button onClick={openHistory} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${quickPanel === 'history' ? 'text-blue-700' : 'text-gray-500'}`} style={quickPanel === 'history' ? { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}><HiOutlineClock className="w-3.5 h-3.5" /><span className="hidden md:inline">History</span></button>
          <button onClick={openSummary} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${quickPanel === 'summary' ? 'text-emerald-700' : 'text-gray-500'}`} style={quickPanel === 'summary' ? { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}><HiOutlineChartBar className="w-3.5 h-3.5" /><span className="hidden md:inline">My Billing</span></button>
          {lastReceipt && <button onClick={() => printReceipt()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500" style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}><HiOutlinePrinter className="w-3.5 h-3.5" /><span className="hidden md:inline">Reprint</span></button>}
          {heldBills.length > 0 && <button onClick={() => setShowHeldPanel(!showHeldPanel)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showHeldPanel ? 'text-amber-700' : 'text-amber-600'}`} style={showHeldPanel ? { background: '#e8edf5', boxShadow: 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' } : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}><HiOutlinePause className="w-3.5 h-3.5" /> {heldBills.length} Parked</button>}
          </div>
          {/* Pagination (right) */}
          {productsPagination && productsPagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 hidden lg:inline">{productsPagination.total} items</span>
              <button disabled={productsPage <= 1} onClick={() => setProductsPage(productsPage - 1)} className="px-2 py-1.5 text-xs font-medium rounded-xl text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}>‹</button>
              <span className="text-xs font-medium text-gray-700 min-w-[3rem] text-center">{productsPage}/{productsPagination.totalPages}</span>
              <button disabled={productsPage >= productsPagination.totalPages} onClick={() => setProductsPage(productsPage + 1)} className="px-2 py-1.5 text-xs font-medium rounded-xl text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: '#e8edf5', boxShadow: '2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff' }}>›</button>
            </div>
          )}
        </div>
      </div>

      {/* ─── MIDDLE: Quick Lookup Panel ────────────────────── */}
      {quickPanel && (
        <div className="w-72 lg:w-80 rounded-3xl flex flex-col overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{quickPanel === 'history' ? 'Recent Sales' : "Today's Summary"}</h2>
            <button onClick={() => setQuickPanel(null)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400"><HiOutlineXMark className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {quickPanel === 'history' && (
              historyLoading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              : historyData.length === 0 ? <p className="text-center text-xs text-gray-400 py-8">No recent transactions</p>
              : <div className="space-y-1.5">{historyData.map((tx) => (
                <div key={tx.id} className="p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => printReceipt(tx)}>
                  <div className="flex justify-between items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900">{tx.receipt_number}</p>
                      <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}{tx.customer_name ? ` · ${tx.customer_name}` : ''}</p>
                      {tx.biller_name && <p className="text-[10px] text-primary-500">Billed by {tx.biller_name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">₹{parseFloat(tx.net_amount || tx.total_amount).toFixed(0)}</span>
                      <HiOutlinePrinter className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600" />
                    </div>
                  </div>
                </div>
              ))}<p className="text-center text-[10px] text-purple-600 font-medium pt-2 border-t border-gray-100 mt-2">Contact Sales Section for more!</p></div>
            )}
            {quickPanel === 'summary' && (
              summaryLoading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
              : summaryData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-emerald-50 rounded-xl text-center"><p className="text-[10px] text-emerald-600 font-semibold uppercase">Revenue</p><p className="text-lg font-bold text-emerald-700">₹{parseFloat(summaryData.total_revenue || 0).toFixed(0)}</p></div>
                    <div className="p-3 bg-blue-50 rounded-xl text-center"><p className="text-[10px] text-blue-600 font-semibold uppercase">Bills</p><p className="text-lg font-bold text-blue-700">{summaryData.total_transactions || 0}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-red-50 rounded-xl text-center"><p className="text-[10px] text-red-600 font-semibold uppercase">Expenses</p><p className="text-lg font-bold text-red-700">₹{parseFloat(summaryData.total_expenses || 0).toFixed(0)}</p></div>
                    <div className="p-3 bg-purple-50 rounded-xl text-center"><p className="text-[10px] text-purple-600 font-semibold uppercase">Net</p><p className="text-lg font-bold text-purple-700">₹{parseFloat(summaryData.net_income || 0).toFixed(0)}</p></div>
                  </div>
                </div>
              ) : <p className="text-center text-xs text-gray-400 py-8">No data</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ RIGHT: Cart + Checkout ══════════════════════════════ */}
      <div className="w-[360px] lg:w-[400px] rounded-3xl flex flex-col overflow-hidden" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {/* Held bills banner */}
        {heldBills.length > 0 && !showHeldPanel && (
          <button onClick={() => setShowHeldPanel(true)} className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between hover:bg-amber-100/80 transition-colors">
            <span className="text-xs font-medium text-amber-700 flex items-center gap-1.5"><HiOutlinePause className="w-3.5 h-3.5" /> {heldBills.length} bill{heldBills.length > 1 ? 's' : ''} parked</span>
            <span className="text-[10px] text-amber-600 font-medium">View →</span>
          </button>
        )}

        {/* Held bills expanded */}
        {showHeldPanel && (
          <div className="border-b border-gray-200 max-h-48 overflow-y-auto">
            <div className="px-4 py-2 bg-amber-50 flex items-center justify-between sticky top-0 z-10">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Parked Bills</span>
              <button onClick={() => setShowHeldPanel(false)} className="text-[10px] text-amber-600 font-medium hover:text-amber-800">Close ×</button>
            </div>
            <div className="p-2 space-y-1.5">
              {heldBills.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{bill.label}</p>
                    <p className="text-[10px] text-gray-400">{bill.items.length} items · ₹{bill.items.reduce((s, i) => s + i.quantity * i.unit_price, 0).toFixed(0)}</p>
                  </div>
                  <button onClick={() => resumeBill(bill)} className="px-2.5 py-1 text-[11px] font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Resume</button>
                  <button onClick={() => deleteHeldBill(bill.id)} className="p-1 text-red-400 hover:text-red-600"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cart header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(200,207,216,0.3)' }}>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2.5">
            <HiOutlineReceiptPercent className="w-5 h-5 text-primary-600" /> Cart
            {cart.length > 0 && <span className="text-xs font-normal text-gray-400">({cart.length})</span>}
          </h2>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <>
                <button onClick={holdBill} title="Park this bill (F9)" className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"><HiOutlinePause className="w-3 h-3" /> Hold</button>
                <button onClick={clearCart} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Clear all"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <HiOutlineShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Tap products to add</p>
              <p className="text-xs text-gray-300 mt-1">or scan barcode</p>
              {heldBills.length > 0 && (
                <button onClick={() => setShowHeldPanel(true)} className="mt-4 text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  <HiOutlinePlay className="w-3.5 h-3.5" /> {heldBills.length} parked bill{heldBills.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          ) : cart.map((item, index) => (
            <div key={`${item.product_id}-${index}`} className="flex items-center gap-3 p-3.5 rounded-2xl group transition-colors" style={{ background: "#e8edf5", boxShadow: "inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}{item.has_offer && <span className="ml-1 text-[10px] text-emerald-600">⚡</span>}</p>
                <p className="text-[11px] text-gray-500">₹{item.unit_price} × {item.unit === 'kg' ? item.quantity.toFixed(3) : item.quantity}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateCartQuantity(index, item.unit === 'kg' ? -0.1 : -1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600" style={{ background: "#e8edf5", boxShadow: "2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff" }}><HiOutlineMinus className="w-3 h-3" /></button>
                <span className="text-xs font-bold w-14 text-center text-gray-900">₹{(item.quantity * item.unit_price).toFixed(0)}</span>
                <button onClick={() => updateCartQuantity(index, item.unit === 'kg' ? 0.1 : 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600" style={{ background: "#e8edf5", boxShadow: "2px 2px 4px #c8cfd8, -2px -2px 4px #ffffff" }}><HiOutlinePlus className="w-3 h-3" /></button>
                <button onClick={() => removeFromCart(index)} className="w-7 h-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100"><HiOutlineTrash className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Footer / Checkout */}
        <div className="p-5 space-y-4" style={{ borderTop: "1px solid rgba(200,207,216,0.4)" }}>
          {/* Totals */}
          <div className="space-y-1">
            {discountAmount > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Discount</span><span className="text-red-500 font-medium">-₹{discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-xl font-bold text-gray-900">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Section */}
          {!showCheckout ? (
            <div className="space-y-2">
              <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="btn-primary w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                Checkout{cart.length > 0 ? ` · ₹${total.toFixed(0)}` : ''}
              </button>
              {lastReceipt && <button onClick={() => printReceipt()} className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-xl" style={{ background: "#e8edf5", boxShadow: "3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff" }}><HiOutlinePrinter className="w-3.5 h-3.5" /> Reprint Last</button>}
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {/* Customer Autocomplete */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Customer</label>
                {selectedCustomer ? (
                  /* ── Selected: Saved Customer Chip ── */
                  <div className="flex items-center gap-2.5 p-2.5 bg-primary-50 border border-primary-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 text-xs font-bold">{selectedCustomer.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedCustomer.name}</p>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">Saved</span>
                      </div>
                      <p className="text-[11px] text-gray-500">{selectedCustomer.phone || selectedCustomer.email || 'No phone'}</p>
                    </div>
                    {parseFloat(selectedCustomer.balance) > 0 && (
                      <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md flex-shrink-0">₹{selectedCustomer.balance} due</span>
                    )}
                    <button onClick={clearCustomer} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition-colors">
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* ── Search input (always visible when no customer selected) ── */
                  <div className="relative">
                    <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Type name or phone to search..."
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => { if (customerResults.length > 0) setShowCustomerDropdown(true); }}
                      onBlur={() => { setTimeout(() => setShowCustomerDropdown(false), 200); }}
                      className="input-field text-sm pl-9 py-2.5"
                      autoComplete="off"
                    />
                    {customerSearch && (
                      <button onClick={() => { setCustomerSearch(''); setCustomerResults([]); setShowCustomerDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <HiOutlineXMark className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* "New customer" hint below input */}
                    {customerSearch.length >= 2 && !showCustomerDropdown && customerResults.length === 0 && (
                      <div className="flex items-center gap-2 mt-1.5 px-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">New</span>
                        <span className="text-[11px] text-amber-600">Not in contacts —</span>
                        <button type="button" onClick={handleAddNewCustomer} className="text-[11px] text-amber-700 underline font-semibold hover:text-amber-800">save as customer</button>
                      </div>
                    )}

                    {/* Dropdown results */}
                    {showCustomerDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl overflow-hidden" style={{ background: "#e8edf5", boxShadow: "8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff" }}>
                        {customerResults.length > 0 && (
                          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Saved Contacts</p>
                          </div>
                        )}
                        <div className="max-h-44 overflow-y-auto">
                          {customerResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-primary-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <span className="text-emerald-700 text-xs font-bold">{c.name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                                <p className="text-[11px] text-gray-400">{c.phone || c.email || '—'}</p>
                              </div>
                              {parseFloat(c.balance) > 0 && (
                                <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md flex-shrink-0">₹{c.balance}</span>
                              )}
                            </button>
                          ))}
                        </div>
                        {customerSearch.length >= 2 && customerResults.length === 0 && (
                          <div className="px-3.5 py-3 text-center border-t border-gray-50">
                            <p className="text-xs text-gray-500">No saved contact for "<span className="font-medium">{customerSearch}</span>"</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Press Tab or click away to use as new name</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Discount */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Discount (₹)</label>
                <input type="number" min="0" step="1" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input-field text-sm py-2" />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Payment</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[{ id: 'cash', label: 'Cash' }, { id: 'upi', label: 'UPI' }, { id: 'card', label: 'Card' }, { id: 'credit', label: 'Udhar' }].map((m) => (
                    <button key={m.id} onClick={() => { if (m.id === 'credit') { setIsCredit(true); setPaymentMethod('cash'); } else { setIsCredit(false); setPaymentMethod(m.id); } }}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors ${(m.id === 'credit' && isCredit) || (m.id === paymentMethod && !isCredit) ? m.id === 'credit' ? 'bg-red-600 text-white' : 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m.label}</button>
                  ))}
                </div>
              </div>

              {isCredit && <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-[11px] text-yellow-800">₹{total.toFixed(0)} credit to {selectedCustomer?.name || 'customer'}{!selectedCustomer && <span className="font-medium"> — select above</span>}</div>}

              {paymentMethod === 'cash' && !isCredit && (
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Amount Received</label>
                  <input type="number" min="0" placeholder={total.toFixed(0)} value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="input-field text-sm py-2" />
                  {change > 0 && <p className="text-center text-sm font-bold text-emerald-600 mt-2">Change: ₹{change.toFixed(2)}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowCheckout(false)} className="btn-secondary flex-1 text-xs py-2.5">Back</button>
                <button onClick={handleCheckout} disabled={loading || (isCredit && !selectedCustomer)} className="btn-primary flex-1 text-xs py-2.5 disabled:opacity-40">
                  {loading ? <span className="flex items-center justify-center gap-1"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> ...</span> : `Pay ₹${total.toFixed(0)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
