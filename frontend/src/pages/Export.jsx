import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowDownTray, HiOutlineArrowUpTray, HiOutlineDocumentText,
  HiOutlineTableCells, HiOutlineCodeBracket, HiOutlineCube,
  HiOutlineUsers, HiOutlineBuildingStorefront, HiOutlineShoppingCart,
  HiOutlineTruck, HiOutlineArchiveBox, HiOutlineBanknotes,
  HiOutlineReceiptPercent, HiOutlineCheck, HiOutlineArrowPath,
} from 'react-icons/hi2';
import { usePageTitle } from '../hooks/usePageTitle';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ENTITIES = [
  { key: 'products', label: 'Products', icon: HiOutlineCube, desc: 'All products with stock, prices, categories' },
  { key: 'customers', label: 'Customers', icon: HiOutlineUsers, desc: 'Customer list with phone, email, balance' },
  { key: 'suppliers', label: 'Suppliers', icon: HiOutlineBuildingStorefront, desc: 'Supplier details and contacts' },
  { key: 'sales', label: 'Sales', icon: HiOutlineShoppingCart, desc: 'All invoice sales with totals' },
  { key: 'purchases', label: 'Purchases', icon: HiOutlineTruck, desc: 'Purchase orders and supplier payments' },
  { key: 'transactions', label: 'POS Transactions', icon: HiOutlineReceiptPercent, desc: 'All POS checkout receipts' },
  { key: 'expenses', label: 'Expenses', icon: HiOutlineBanknotes, desc: 'Business expenses by category' },
  { key: 'inventory', label: 'Inventory', icon: HiOutlineArchiveBox, desc: 'Current stock levels for all products' },
];

const FORMATS = [
  { key: 'xlsx', label: 'Excel (.xlsx)', icon: HiOutlineTableCells, color: 'text-green-600' },
  { key: 'csv', label: 'CSV (.csv)', icon: HiOutlineDocumentText, color: 'text-blue-600' },
  { key: 'json', label: 'JSON (.json)', icon: HiOutlineCodeBracket, color: 'text-purple-600' },
];

const NEO = {
  raised: { background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' },
  raisedSm: { background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' },
  inset: { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' },
};

export default function Export() {
  usePageTitle('Export & Import');
  const [selectedEntity, setSelectedEntity] = useState('products');
  const [selectedFormat, setSelectedFormat] = useState('xlsx');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/export/${selectedEntity}?format=${selectedFormat}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const ext = selectedFormat;
      const filename = `${selectedEntity}_export_${new Date().toISOString().slice(0, 10)}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedEntity} as ${ext.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/import/${selectedEntity}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');

      setImportResult(result.data);
      toast.success(result.message || `Imported ${result.data?.imported || 0} records`);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const entityConfig = ENTITIES.find(e => e.key === selectedEntity);
  const canImport = ['products', 'customers', 'suppliers'].includes(selectedEntity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Export & Import</h1>
        <p className="text-sm text-gray-500 mt-1">Download your data or bulk-import from files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Entity Selection */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Select Data</p>
          {ENTITIES.map(entity => {
            const Icon = entity.icon;
            const active = selectedEntity === entity.key;
            return (
              <button key={entity.key} onClick={() => { setSelectedEntity(entity.key); setImportResult(null); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={active ? NEO.inset : NEO.raisedSm}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-sm font-medium ${active ? 'text-indigo-700' : 'text-gray-700'}`}>{entity.label}</p>
                  <p className="text-[11px] text-gray-400">{entity.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Export Section */}
          <div className="rounded-3xl p-6" style={NEO.raised}>
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineArrowDownTray className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-800">Export {entityConfig?.label}</h2>
            </div>

            {/* Format Selection */}
            <p className="text-xs text-gray-500 mb-3">Choose format:</p>
            <div className="flex gap-3 mb-5">
              {FORMATS.map(fmt => {
                const Icon = fmt.icon;
                const active = selectedFormat === fmt.key;
                return (
                  <button key={fmt.key} onClick={() => setSelectedFormat(fmt.key)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={active ? NEO.inset : NEO.raisedSm}>
                    <Icon className={`w-4 h-4 ${active ? fmt.color : 'text-gray-400'}`} />
                    <span className={active ? 'text-gray-800' : 'text-gray-500'}>{fmt.label}</span>
                    {active && <HiOutlineCheck className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>

            {/* Export Button */}
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
              {exporting ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> : <HiOutlineArrowDownTray className="w-4 h-4" />}
              {exporting ? 'Exporting...' : `Download ${entityConfig?.label} (.${selectedFormat})`}
            </button>
          </div>

          {/* Import Section */}
          <div className="rounded-3xl p-6" style={NEO.raised}>
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineArrowUpTray className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-800">Import {entityConfig?.label}</h2>
            </div>

            {canImport ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Upload an Excel (.xlsx), CSV, or JSON file to bulk-import {entityConfig?.label.toLowerCase()}.
                  Duplicate entries will be skipped automatically.
                </p>

                <div className="rounded-2xl p-4 mb-4" style={NEO.inset}>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Expected columns:</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {selectedEntity === 'products' && 'name, sku, barcode, selling_price, purchase_price, mrp, unit, brand, weight, description'}
                    {selectedEntity === 'customers' && 'name, phone, email, address'}
                    {selectedEntity === 'suppliers' && 'name, phone, email, address, gst_number'}
                  </p>
                </div>

                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleImport} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(145deg, #059669, #047857)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}>
                  {importing ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> : <HiOutlineArrowUpTray className="w-4 h-4" />}
                  {importing ? 'Importing...' : 'Select File & Import'}
                </button>

                {importResult && (
                  <div className="mt-4 rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-800">
                      Import complete: {importResult.imported} imported, {importResult.skipped} skipped (of {importResult.total} total)
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl p-6 text-center" style={NEO.inset}>
                <p className="text-sm text-gray-500">
                  Import is available for <span className="font-medium">Products</span>, <span className="font-medium">Customers</span>, and <span className="font-medium">Suppliers</span>.
                </p>
                <p className="text-xs text-gray-400 mt-1">Select one of those to enable import.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
