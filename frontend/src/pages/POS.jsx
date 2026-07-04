import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineScale, HiOutlinePrinter, HiOutlineTrash, HiOutlineMinus, HiOutlinePlus, HiOutlineQrCode } from 'react-icons/hi2';
import { posApi } from '../api/pos.api';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [scaleWeight, setScaleWeight] = useState(0);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);
  const barcodeRef = useRef(null);
  const scalePort = useRef(null);
  const scaleReader = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);

  // Load products
  useEffect(() => {
    loadProducts();
  }, [search, categoryFilter]);

  const loadProducts = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category_id = categoryFilter;
      const response = await posApi.getProducts(params);
      setProducts(response.data);

      // Extract unique categories
      const cats = [...new Map(response.data.filter(p => p.category_name).map(p => [p.category_id, { id: p.category_id, name: p.category_name }])).values()];
      if (cats.length > 0 && categories.length === 0) setCategories(cats);
    } catch {
      toast.error('Failed to load products');
    }
  };

  // Barcode scanner - listens for rapid keyboard input (scanners type fast + Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field (except barcode field)
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
        // Clear buffer after 100ms of no input (human typing is slower)
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = async (code) => {
    try {
      const response = await posApi.lookupBarcode(code.trim());
      const product = response.data;
      addToCart(product);
      toast.success(`Scanned: ${product.name}`);
    } catch {
      toast.error(`Product not found for barcode: ${code}`);
    }
  };

  // Manual barcode input submit
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  // Scale connection (Web Serial API)
  const connectScale = async () => {
    try {
      if (!('serial' in navigator)) {
        toast.error('Web Serial API not supported. Use Chrome or Edge.');
        return;
      }
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      scalePort.current = port;
      setScaleConnected(true);
      toast.success('Scale connected!');
      readScale(port);
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        toast.error('Failed to connect scale: ' + err.message);
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

        // Most scales send weight terminated with \r\n or \n
        const lines = buffer.split(/[\r\n]+/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          const weight = parseWeight(line);
          if (weight !== null) {
            setScaleWeight(weight);
          }
        }
      }
    } catch {
      // Reader cancelled
    }
  };

  const parseWeight = (data) => {
    // Common scale protocols: "ST,GS,  0.500kg", "  500 g", "0.500"
    const cleaned = data.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 0 && num < 100) {
      return num;
    }
    return null;
  };

  const disconnectScale = async () => {
    try {
      if (scaleReader.current) {
        await scaleReader.current.cancel();
        scaleReader.current = null;
      }
      if (scalePort.current) {
        await scalePort.current.close();
        scalePort.current = null;
      }
      setScaleConnected(false);
      setScaleWeight(0);
      toast.success('Scale disconnected');
    } catch {
      setScaleConnected(false);
    }
  };

  // Cart management
  const addToCart = useCallback((product) => {
    const quantity = product.unit === 'kg' && scaleWeight > 0 ? scaleWeight : 1;
    const price = product.offer_price ? parseFloat(product.offer_price) : parseFloat(product.selling_price);

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing && product.unit !== 'kg') {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit: product.unit,
          unit_price: price,
          original_price: parseFloat(product.selling_price),
          has_offer: !!product.offer_price,
        },
      ];
    });

    if (product.unit === 'kg' && scaleWeight > 0) {
      toast.success(`${product.name}: ${scaleWeight}kg added`);
    }
  }, [scaleWeight]);

  const updateCartQuantity = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(0.01, updated[index].quantity + delta) };
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setCustomerName('');
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const change = (parseFloat(amountReceived) || 0) - total;

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const response = await posApi.checkout({
        items: cart,
        customer_name: customerName || undefined,
        discount: discountAmount || undefined,
        payment_method: paymentMethod,
        amount_received: parseFloat(amountReceived) || total,
      });

      setLastReceipt(response.data);
      toast.success(`Checkout complete! Receipt: ${response.data.receipt_number}`);
      setCart([]);
      setDiscount('');
      setCustomerName('');
      setAmountReceived('');
      setShowCheckout(false);
      loadProducts(); // Refresh stock
    } catch (err) {
      toast.error('Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  // Print receipt
  const printReceipt = async (receipt) => {
    const receiptData = receipt || lastReceipt;
    if (!receiptData) return;

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .bold { font-weight: bold; }
        .big { font-size: 14px; }
      </style></head><body>
      <div class="center bold big">SHOPKEEPER</div>
      <div class="center">Vegetable & Grocery Store</div>
      <div class="line"></div>
      <div class="row"><span>Receipt:</span><span>${receiptData.receipt_number}</span></div>
      <div class="row"><span>Date:</span><span>${new Date(receiptData.created_at).toLocaleString()}</span></div>
      ${receiptData.customer_name ? `<div class="row"><span>Customer:</span><span>${receiptData.customer_name}</span></div>` : ''}
      <div class="line"></div>
      ${receiptData.items.map(item => `
        <div>${item.product_name}</div>
        <div class="row"><span>  ${item.quantity}${item.unit === 'kg' ? 'kg' : 'x'} × ₹${item.unit_price}</span><span>₹${item.total.toFixed(2)}</span></div>
      `).join('')}
      <div class="line"></div>
      <div class="row bold"><span>Subtotal:</span><span>₹${receiptData.total_amount}</span></div>
      ${receiptData.discount > 0 ? `<div class="row"><span>Discount:</span><span>-₹${receiptData.discount}</span></div>` : ''}
      <div class="row bold big"><span>TOTAL:</span><span>₹${receiptData.net_amount}</span></div>
      <div class="line"></div>
      <div class="row"><span>Paid (${receiptData.payment_method}):</span><span>₹${receiptData.amount_received}</span></div>
      ${receiptData.change_amount > 0 ? `<div class="row"><span>Change:</span><span>₹${receiptData.change_amount}</span></div>` : ''}
      <div class="line"></div>
      <div class="center">Thank you! Visit again.</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 -m-4 md:-m-6 p-4 md:p-6">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search vegetables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <button
            onClick={() => { setBarcodeMode(!barcodeMode); setTimeout(() => barcodeRef.current?.focus(), 100); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              barcodeMode ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle barcode scanner input"
          >
            <HiOutlineQrCode className="w-5 h-5" />
            Barcode
          </button>
          <button
            onClick={scaleConnected ? disconnectScale : connectScale}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              scaleConnected ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <HiOutlineScale className="w-5 h-5" />
            {scaleConnected ? `${scaleWeight.toFixed(3)}kg` : 'Scale'}
          </button>
        </div>

        {/* Barcode Scanner Input */}
        {barcodeMode && (
          <form onSubmit={handleBarcodeSubmit} className="mb-4 flex gap-2">
            <input
              ref={barcodeRef}
              type="text"
              placeholder="Scan barcode or type manually..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="input-field flex-1 font-mono"
              autoFocus
            />
            <button type="submit" className="btn-primary px-4">Add</button>
          </form>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
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
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Scale Weight Display */}
        {scaleConnected && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-medium">Scale Reading:</span>
            <span className="text-2xl font-bold text-green-800">{scaleWeight.toFixed(3)} kg</span>
          </div>
        )}

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Item</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Price</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Stock</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">Add</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-primary-50 cursor-pointer" onClick={() => addToCart(product)}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {product.image_url && <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.barcode || product.sku || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{product.category_name || '-'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {product.offer_price ? (
                      <div>
                        <span className="font-semibold text-green-600">₹{product.offer_price}</span>
                        <span className="text-xs text-gray-400 line-through ml-1">₹{product.selling_price}</span>
                        <span className="block text-xs text-green-600">{product.offer?.name}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-primary-600">₹{product.selling_price}/{product.unit === 'kg' ? 'kg' : product.unit}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{product.stock} {product.unit}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                      className="w-7 h-7 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 flex items-center justify-center mx-auto"
                    >
                      <HiOutlinePlus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="5" className="px-3 py-8 text-center text-gray-400">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-80 lg:w-96 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Cart ({cart.length})</h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700">
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              Tap products to add to cart
              {scaleConnected && <><br />Weight auto-reads for kg items</>}
            </p>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity.toFixed(item.unit === 'kg' ? 3 : 0)} {item.unit} × ₹{item.unit_price}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(index, item.unit === 'kg' ? -0.1 : -1)}
                    className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    <HiOutlineMinus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-medium w-10 text-center">
                    ₹{(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(index, item.unit === 'kg' ? 0.1 : 1)}
                    className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    <HiOutlinePlus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    <HiOutlineTrash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="text-red-500">-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary-600">₹{total.toFixed(2)}</span>
          </div>

          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Checkout (₹{total.toFixed(2)})
            </button>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field text-sm"
              />
              <input
                type="number"
                placeholder="Discount (₹)"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="input-field text-sm"
              />
              <div className="flex gap-2">
                {['cash', 'upi', 'card'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                      paymentMethod === method ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              {paymentMethod === 'cash' && (
                <>
                  <input
                    type="number"
                    placeholder="Amount received (₹)"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="input-field text-sm"
                  />
                  {change > 0 && (
                    <div className="text-center text-lg font-bold text-green-600">
                      Change: ₹{change.toFixed(2)}
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="btn-secondary flex-1 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="btn-primary flex-1 text-sm"
                >
                  {loading ? 'Processing...' : 'Pay ₹' + total.toFixed(2)}
                </button>
              </div>
            </div>
          )}

          {/* Print last receipt */}
          {lastReceipt && (
            <button
              onClick={() => printReceipt()}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <HiOutlinePrinter className="w-4 h-4" /> Print Last Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
