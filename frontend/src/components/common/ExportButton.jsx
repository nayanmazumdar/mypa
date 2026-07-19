import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { HiOutlineArrowDownTray, HiOutlineArrowUpTray, HiOutlineTableCells, HiOutlineDocumentText, HiOutlineCodeBracket } from 'react-icons/hi2';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const FORMATS = [
  { key: 'xlsx', label: 'Excel (.xlsx)', icon: HiOutlineTableCells },
  { key: 'csv', label: 'CSV (.csv)', icon: HiOutlineDocumentText },
  { key: 'json', label: 'JSON (.json)', icon: HiOutlineCodeBracket },
];

/**
 * Contextual export button — place it in any page header.
 * 
 * Props:
 * - entity: string — the backend entity name (products, customers, sales, etc.)
 * - filters: object — optional query params to pass (date range, search, etc.)
 * - label: string — optional button label override
 * - canImport: boolean — if true, also shows an import option
 */
export default function ExportButton({ entity, filters = {}, label, canImport = false }) {
  const user = useSelector((state) => state.auth.user);
  if (user?.role === 'staff') return null;

  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const ref = useRef(null);
  const fileInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleExport = async (format) => {
    setOpen(false);
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ format, ...filters });
      const response = await fetch(`${API_BASE}/export/${entity}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Export failed');
      }

      const blob = await response.blob();
      const filename = `${entity}_${new Date().toISOString().slice(0, 10)}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpen(false);
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/import/${entity}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');
      setImportResult(result.data);
      toast.success(`Imported ${result.data?.imported || 0}, skipped ${result.data?.skipped || 0}`);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting || importing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-800 transition-all"
        style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
        title={canImport ? 'Export / Import' : 'Export data'}
      >
        <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{importing ? 'Importing...' : exporting ? 'Exporting...' : (label || 'Export')}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-xl p-1.5 shadow-lg"
          style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff', width: canImport ? '12rem' : '11rem' }}>
          
          <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Export</p>
          {FORMATS.map(fmt => {
            const Icon = fmt.icon;
            return (
              <button key={fmt.key} onClick={() => handleExport(fmt.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-colors text-left">
                <Icon className="w-4 h-4 text-gray-400" />
                {fmt.label}
              </button>
            );
          })}

          {canImport && (
            <>
              <div className="my-1.5 h-px bg-gray-200/60" />
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Import</p>
              <button onClick={() => { fileInputRef.current?.click(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50/50 transition-colors text-left">
                <HiOutlineArrowUpTray className="w-4 h-4" />
                Upload File (.xlsx/.csv/.json)
              </button>
            </>
          )}
        </div>
      )}

      {/* Hidden file input for import */}
      {canImport && (
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleImport} className="hidden" />
      )}
    </div>
  );
}
