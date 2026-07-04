import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineScale, HiOutlinePrinter, HiOutlineTrash, HiOutlineMinus,
  HiOutlinePlus, HiOutlineQrCode, HiOutlineUser, HiOutlineMagnifyingGlass,
  HiOutlineShoppingCart, HiOutlineXMark, HiOutlineReceiptPercent,
} from 'react-icons/hi2';
import { posApi } from '../api/pos.api';
import api from '../api/axios';

export default function POS() {
  // Product state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
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

  // Refs
  const customerSearchTimer = useRef(null);
  const barcodeRef = useRef(null);
  const scalePort = useRef(null);
  const scaleReader = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);
  const searchInputRef = useRef(null);

  // ─── Load Products ────────────────────────────────────────────
  useEffect(() => {
    loadProducts();
  }, [search, categoryFilter]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category_id = categoryFilter;
      const response = await posApi.getProducts(params);
      const data = response.data || response || [];
      setProducts(Array.isArray(data) ? data : []);

      // Extract unique categories on first load
      if (categories.length === 0) {
        const items = Array.isArray(data) ? data : [];
        const cats = [...new Map(
          items.filter(p => p.category_name)
            .map(p => [p.category_id, { id: p.category_id, name: p.category_name }])
        ).values()];
        if (cats.length > 0) setCategories(cats);
      }
    } catch {
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  // ─── Customer Search ──────────────────────────────────────────
  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);
    setSelectedCustomer(null);
    clearTimeout(customerSearchTimer.current);
    if (value.length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/customers/search/quick', { params: { q: value } });
        const data = res.data || res || [];
        setCustomerResults(Array.isArray(data) ? data : []);
        setShowCustomerDropdown(true);
      } catch {
        setCustomerResults([]);
      }
    }, 300);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setIsCredit(false);
  };

  // ─── Barcode Scanner ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' && e.target !== barcodeRef.current) return;

      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        e.preventDefault();
        handleBarcodeScan(barcodeBuffer.current);
        barcodeBuffer.current = '';
        setBarcodeInput('');
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeScan = async (code) => {
    try {
      const response = await posApi.lookupBarcode(code.trim());
      const product = response.data || response;
      addToCart(product);
      toast.success(`Scanned: ${product.name}`);
    } catch {
      toast.error(`Product not found: ${code}`);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  // ─── Scale (Web Serial API) ───────────────────────────────────
  const connectScale = async () => {
    if (!('serial' in navigator)) {
      toast.error('Web Serial API not supported. Use Chrome or Edge.');
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      scalePort.current = port;
      setScaleConnected(true);
      toast.success('Scale connected!');
      readScale(port);
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        toast.error('Failed to connect scale');
      }
    }
  };

  const readScale = async (port) => {
    const reader = port.readable.getReader();
    scaleReader.current = reader;
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split(/[\r\n]+/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          const weight = parseWeight(line);
          if (weight !== null) setScaleWeight(weight);
        }
      }
    } catch { /* reader cancelled */ }
  };

  const parseWeight = (data) => {
    const cleaned = data.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return (!isNaN(num) && num >= 0 && num < 100) ? num : null;
  };

  const disconnectScale = async () => {
    try {
      if (scaleReader.current) { await scaleReader.current.cancel(); scaleReader.current = null; }
      if (scalePort.current) { await scalePort.current.close(); scalePort.current = null; }
      setScaleConnected(false);
      setScaleWeight(0);
      toast.success('Scale disconnected');
    } catch { setScaleConnected(false); }
  };

  // ─── Cart Management ──────────────────────────────────────────
  const addToCart = useCallback((product) => {
    const quantity = product.unit === 'kg' && scaleWeight > 0 ? scaleWeight : 1;
    const price = product.offer_price
      ? parseFloat(product.offer_price)
      : parseFloat(product.selling_price);

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id);
      if (existingIdx >= 0 && product.unit !== 'kg') {
        return prev.map((item, i) =>
          i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit: product.unit || 'piece',
          unit_price: price,
          original_price: parseFloat(product.selling_price),
          has_offer: !!product.offer_price,
          stock: parseFloat(product.stock) || 0,
        },
      ];
    });

    if (product.unit === 'kg' && scaleWeight > 0) {
      toast.success(`${product.name}: ${scaleWeight.toFixed(3)}kg added`);
    }
  }, [scaleWeight]);

  const updateCartQuantity = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: Math.round(newQty * 1000) / 1000 };
      return updated;
    });
  };

  const setCartItemQuantity = (index, value) => {
    const qty = parseFloat(value);
    if (isNaN(qty) || qty <= 0) return;
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: qty };
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setAmountReceived('');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setIsCredit(false);
    setShowCheckout(false);
  };

  // ─── Totals ───────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const change = (parseFloat(amountReceived) || 0) - total;

  // ─── Checkout ─────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (isCredit && !selectedCustomer) {
      toast.error('Select a customer for credit/udhar sale');
      return;
    }
    if (paymentMethod === 'cash' && !isCredit) {
      const received = parseFloat(amountReceived) || 0;
      if (received > 0 && received < total) {
        toast.error('Amount received is less than total');
        return;
      }
    }

    setLoading(true);
    try {
      const response = await posApi.checkout({
        items: cart.map(({ product_id, product_name, quantity, unit, unit_price }) => ({
          product_id, product_name, quantity, unit, unit_price,
        })),
        customer_name: selectedCustomer?.name || customerSearch || undefined,
        customer_id: selectedCustomer?.id || undefined,
        discount: discountAmount || undefined,
        payment_method: isCredit ? 'credit' : paymentMethod,
        amount_received: isCredit ? 0 : (parseFloat(amountReceived) || total),
      });

      const receiptData = response.data || response;

      // If credit sale, add to customer balance
      if (isCredit && selectedCustomer?.id) {
        try {
          await api.post(`/customers/${selectedCustomer.id}/credit`, {
            amount: total,
            reference: receiptData.receipt_number,
            notes: `POS Credit Sale - ${receiptData.receipt_number}`,
          });
        } catch { /* non-critical */ }
      }

      setLastReceipt(receiptData);
      toast.success(`Sale complete! ${receiptData.receipt_number}`);

      // Reset
      setCart([]);
      setDiscount('');
      setAmountReceived('');
      setCustomerSearch('');
      setSelectedCustomer(null);
      setIsCredit(false);
      setShowCheckout(false);
      setPaymentMethod('cash');
      loadProducts(); // Refresh stock
    } catch {
      toast.error('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Print Receipt ────────────────────────────────────────────
  const printReceipt = (receipt) => {
    const data = receipt || lastReceipt;
    if (!data) return;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) {
      toast.error('Pop-up blocked. Allow pop-ups to print.');
      return;
    }

    const itemsHtml = (data.items || []).map(item =>
      `<div style="font-size:11px">${item.product_name}</div>
       <div class="row"><span>&nbsp;&nbsp;${item.quantity}${item.unit === 'kg' ? 'kg' : ' x'} × ₹${item.unit_price}</span><span>₹${(item.total || item.quantity * item.unit_price).toFixed(2)}</span></div>`
    ).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 12px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #333; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .bold { font-weight: bold; }
        .big { font-size: 14px; }
      </style></head><body>
      <div class="center bold big">SHOPKEEPER</div>
      <div class="center" style="font-size:11px;margin-top:2px">Retail Billing</div>
      <div class="line"></div>
      <div class="row"><span>Receipt:</span><span>${data.receipt_number}</span></div>
      <div class="row"><span>Date:</span><span>${new Date(data.created_at).toLocaleString('en-IN')}</span></div>
      ${data.customer_name ? `<div class="row"><span>Customer:</span><span>${data.customer_name}</span></div>` : ''}
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="row bold"><span>Subtotal:</span><span>₹${parseFloat(data.total_amount).toFixed(2)}</span></div>
      ${data.discount > 0 ? `<div class="row"><span>Discount:</span><span>-₹${parseFloat(data.discount).toFixed(2)}</span></div>` : ''}
      <div class="row bold big"><span>TOTAL:</span><span>₹${parseFloat(data.net_amount).toFixed(2)}</span></div>
      <div class="line"></div>
      <div class="row"><span>Paid (${data.payment_method}):</span><span>₹${parseFloat(data.amount_received).toFixed(2)}</span></div>
      ${data.change_amount > 0 ? `<div class="row"><span>Change:</span><span>₹${parseFloat(data.change_amount).toFixed(2)}</span></div>` : ''}
      <div class="line"></div>
      <div class="center" style="margin-top:8px">Thank you! Visit again.</div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 200);
  };

  // ─── Keyboard shortcut: F2 to focus search ────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 -m-4 md:-m-6 p-4 md:p-6">
      {/* ─── LEFT: Product List ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & Tools Bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products (F2)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => { setBarcodeMode(!barcodeMode); setTimeout(() => barcodeRef.current?.focus(), 100); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              barcodeMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Barcode Scanner (toggle)"
          >
            <HiOutlineQrCode className="w-4 h-4" />
            <span className="hidden lg:inline">Barcode</span>
          </button>
          <button
            onClick={scaleConnected ? disconnectScale : connectScale}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              scaleConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={scaleConnected ? 'Disconnect scale' : 'Connect weighing scale'}
          >
            <HiOutlineScale className="w-4 h-4" />
            <span className="hidden lg:inline">{scaleConnected ? `${scaleWeight.toFixed(3)}kg` : 'Scale'}</span>
          </button>
        </div>

        {/* Barcode Input */}
        {barcodeMode && (
          <form onSubmit={handleBarcodeSubmit} className="mb-3 flex gap-2">
            <input
              ref={barcodeRef}
              type="text"
              placeholder="Scan or type barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="input-field flex-1 font-mono"
              autoFocus
            />
            <button type="submit" className="btn-primary px-4 text-sm">Add</button>
          </form>
        )}

        {/* Scale Reading */}
        {scaleConnected && (
          <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">Scale:</span>
            <span className="text-xl font-bold text-green-800">{scaleWeight.toFixed(3)} kg</span>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !categoryFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Table */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Item</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 hidden md:table-cell">Category</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Price</th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Stock</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-600 w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productsLoading && products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 py-12 text-center text-gray-400">
                    {search ? `No products matching "${search}"` : 'No products available'}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const inCart = cart.find(c => c.product_id === product.id);
                  const outOfStock = parseFloat(product.stock) <= 0;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => !outOfStock && addToCart(product)}
                      className={`transition-colors ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary-50 cursor-pointer'} ${inCart ? 'bg-primary-50/50' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <HiOutlineShoppingCart className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400 truncate">{product.barcode || product.sku || product.brand || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs hidden md:table-cell">{product.category_name || '-'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {product.offer_price ? (
                          <div>
                            <span className="font-semibold text-green-600">₹{product.offer_price}</span>
                            <span className="text-xs text-gray-400 line-through ml-1">₹{product.selling_price}</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">₹{product.selling_price}<span className="text-xs text-gray-400 font-normal">/{product.unit === 'kg' ? 'kg' : 'pc'}</span></span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-right text-xs font-medium ${outOfStock ? 'text-red-500' : 'text-gray-500'}`}>
                        {outOfStock ? 'Out' : `${product.stock} ${product.unit === 'kg' ? 'kg' : ''}`}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); if (!outOfStock) addToCart(product); }}
                          disabled={outOfStock}
                          className="w-7 h-7 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 flex items-center justify-center mx-auto disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <HiOutlinePlus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── RIGHT: Cart Panel ──────────────────────────────── */}
      <div className="w-80 lg:w-96 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm overflow-hidden">
        {/* Cart Header */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineReceiptPercent className="w-5 h-5 text-primary-600" />
            Bill ({cart.length} item{cart.length !== 1 ? 's' : ''})
          </h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HiOutlineShoppingCart className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Tap products to add to bill</p>
              <p className="text-xs text-gray-300 mt-1">or scan barcode</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.product_id}-${index}`} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product_name}
                    {item.has_offer && <span className="ml-1 text-xs text-green-600">●</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹{item.unit_price} × {item.quantity.toFixed(item.unit === 'kg' ? 3 : 0)} {item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(index, item.unit === 'kg' ? -0.1 : -1)}
                    className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <HiOutlineMinus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-12 text-center text-gray-900">
                    ₹{(item.quantity * item.unit_price).toFixed(0)}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(index, item.unit === 'kg' ? 0.1 : 1)}
                    className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <HiOutlinePlus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HiOutlineTrash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer / Checkout */}
        <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal ({cart.length} items)</span>
              <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-500 font-medium">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-1 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-primary-600">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Section */}
          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Checkout
            </button>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {/* Customer */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Customer (optional)</label>
                <div className="relative">
                  <HiOutlineUser className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    className="input-field text-sm pl-8 pr-8"
                  />
                  {selectedCustomer && (
                    <button onClick={clearCustomer} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <HiOutlineXMark className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Dropdown */}
                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone || c.email || ''}</p>
                        </div>
                        {parseFloat(c.balance) > 0 && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            ₹{c.balance} due
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Credit warning */}
                {selectedCustomer && parseFloat(selectedCustomer.balance) > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ {selectedCustomer.name} has ₹{selectedCustomer.balance} pending credit
                  </p>
                )}
              </div>

              {/* Discount */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'upi', label: 'UPI' },
                    { id: 'card', label: 'Card' },
                    { id: 'credit', label: 'Udhar' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        if (method.id === 'credit') { setIsCredit(true); setPaymentMethod('cash'); }
                        else { setIsCredit(false); setPaymentMethod(method.id); }
                      }}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                        (method.id === 'credit' && isCredit) || (method.id === paymentMethod && !isCredit)
                          ? method.id === 'credit' ? 'bg-red-600 text-white' : 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit warning */}
              {isCredit && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  ₹{total.toFixed(0)} will be added as credit to {selectedCustomer?.name || 'customer'}.
                  {!selectedCustomer && <span className="font-medium"> Select a customer above.</span>}
                </div>
              )}

              {/* Cash amount received */}
              {paymentMethod === 'cash' && !isCredit && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={total.toFixed(0)}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="input-field text-sm"
                  />
                  {change > 0 && (
                    <p className="text-center text-base font-bold text-green-600 mt-2">
                      Change: ₹{change.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="btn-secondary flex-1 text-sm py-2.5"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading || (isCredit && !selectedCustomer)}
                  className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing
                    </span>
                  ) : (
                    `Pay ₹${total.toFixed(0)}`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Print Last Receipt */}
          {lastReceipt && !showCheckout && (
            <button
              onClick={() => printReceipt()}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HiOutlinePrinter className="w-4 h-4" /> Print Last Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
