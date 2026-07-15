import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineBanknotes,
  HiOutlineCalculator,
  HiOutlineArrowDownTray,
  HiOutlinePrinter,
  HiOutlineXMark,
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';
import { individualApi } from '../../api/individual.api';
import api from '../../api/axios';

// ── Date helpers ──────────────────────────────────────────────────────────────
function getFirstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function getToday() { return new Date().toISOString().split('T')[0]; }

function fmtDate(raw) {
  if (!raw) return '';
  const datePart = raw.length > 10 ? raw.substring(0, 10) : raw;
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

const PRESET_RANGES = [
  { label: 'This Month',   getRange: () => ({ from: getFirstOfMonth(), to: getToday() }) },
  {
    label: 'Last Month', getRange: () => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
      const from = d.toISOString().split('T')[0];
      d.setMonth(d.getMonth() + 1); d.setDate(0);
      return { from, to: d.toISOString().split('T')[0] };
    },
  },
  {
    label: 'Last 3 Months', getRange: () => {
      const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1);
      return { from: d.toISOString().split('T')[0], to: getToday() };
    },
  },
  {
    label: 'This Year', getRange: () => ({
      from: `${new Date().getFullYear()}-01-01`, to: getToday(),
    }),
  },
];

// ── PDF generation ────────────────────────────────────────────────────────────

// Convert a URL to a base64 data-URI so jsPDF can embed it
async function toBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function generatePDF(report, userName, from, to, notes = []) {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;

  const INDIGO   = [79,  70,  229];
  const INDIGO_L = [245, 247, 255];
  const GREEN    = [22,  163, 74 ];
  const GREEN_L  = [240, 253, 244];
  const GREEN_D  = [21,  128, 61 ];
  const GREEN_HL = [187, 247, 208];
  const RED      = [220, 38,  38 ];
  const RED_L    = [255, 241, 242];
  const RED_D    = [185, 28,  28 ];
  const RED_HL   = [254, 202, 202];
  const NOTE_BG  = [238, 242, 255]; // indigo-50 equivalent
  const NOTE_BD  = [199, 210, 254]; // indigo-200

  const nv = (v) => parseFloat(v) || 0;
  const rupees = (v) => `Rs.${nv(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtNoteDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Try to load logo ────────────────────────────────────────────────────────
  let logoData = null;
  try { logoData = await toBase64('/logo.png'); } catch { /* skip if unavailable */ }

  // ── Helper: draw page header (white bg, dark text, indigo accent line) ──────
  const drawHeader = () => {
    // White banner
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 36, 'F');

    // Title
    doc.setTextColor(...INDIGO);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Integrated Personal Management Report', M, 13);

    // "Prepared for" line — label normal, name bold
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 100);
    const prepLabel = 'Prepared for: ';
    doc.text(prepLabel, M, 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INDIGO);
    doc.text(userName, M + doc.getTextWidth(prepLabel), 20);

    // Period highlight pill
    const periodLabel = 'Period:';
    const periodValue = `  ${fmtDate(from)}  to  ${fmtDate(to)}`;
    const fullPeriod  = periodLabel + periodValue;

    // Measure text to draw the highlight box behind it
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    const pillW = doc.getTextWidth(fullPeriod) + 6;
    const pillH = 5.5;
    const pillX = M - 2;
    const pillY = 24.5;

    doc.setFillColor(...INDIGO_L);
    doc.setDrawColor(...INDIGO);
    doc.setLineWidth(0.3);
    doc.roundedRect(pillX, pillY, pillW, pillH, 1.5, 1.5, 'FD');

    // "Period:" label in indigo
    doc.setTextColor(...INDIGO);
    doc.text(periodLabel, M, pillY + 3.8);

    // Date range in dark text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 60);
    doc.text(periodValue, M + doc.getTextWidth(periodLabel), pillY + 3.8);

    // Generated date — right-aligned on same row
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 100);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      pageW - M, pillY + 3.8, { align: 'right' }
    );

    // Indigo accent line below header
    doc.setDrawColor(...INDIGO);
    doc.setLineWidth(0.6);
    doc.line(0, 36, pageW, 36);

    doc.setTextColor(30, 30, 30);
  };

  // ── Helper: draw footer — logo left, text centre, page number right ─────────
  const drawFooter = (pageNum, totalPages) => {
    doc.setPage(pageNum);

    // Indigo accent line above footer
    doc.setDrawColor(...INDIGO);
    doc.setLineWidth(0.6);
    doc.line(0, pageH - 14, pageW, pageH - 14);

    // White footer band
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageH - 14, pageW, 14, 'F');

    // Logo on the left
    if (logoData) {
      doc.addImage(logoData, 'PNG', M, pageH - 13, 10, 10);
    }

    // Centred report info
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Integrated Personal Management Report  |  ${fmtDate(from)} - ${fmtDate(to)}`,
      pageW / 2, pageH - 5, { align: 'center' }
    );

    // Page number on the right
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - M, pageH - 5, { align: 'right' });
  };

  // ── Section heading helper ──────────────────────────────────────────────────
  const sectionHeading = (label, y) => {
    doc.setFillColor(...INDIGO);
    doc.rect(M, y, 3, 6, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(label, M + 6, y + 5);
    return y + 10;
  };

  // ── Draw first page header ──────────────────────────────────────────────────
  drawHeader();

  const net      = nv(report.summary.net_balance);
  const totalInc = nv(report.summary.total_income);
  const totalExp = nv(report.summary.total_expense);
  const openBal  = nv(report.summary.opening_balance);
  const closeBal = nv(report.summary.closing_balance);

  // ── 1. Opening / Closing Balance — two prominent header cards ───────────────
  let y = 44;
  const balCardW  = (pageW - M * 2 - 6) / 2;
  const balCardH  = 22;
  const balRadius = 3;

  const BLUE   = [37,  99,  235];   // blue-600
  const BLUE_L = [239, 246, 255];   // blue-50
  const BLUE_D = [29,  78,  216];   // blue-700

  // Opening Balance card (left)
  doc.setFillColor(...BLUE_L);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, balCardW, balCardH, balRadius, balRadius, 'FD');
  // Left accent bar
  doc.setFillColor(...BLUE);
  doc.roundedRect(M, y, 3, balCardH, balRadius, balRadius, 'F');
  doc.rect(M + 1.5, y, 1.5, balCardH, 'F');
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('OPENING BALANCE', M + 7, y + 7);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 112);
  doc.text(`As of ${fmtDate(from)}`, M + 7, y + 12.5);
  // Value
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE_D);
  doc.text(rupees(openBal), M + balCardW - 4, y + 14, { align: 'right' });

  // Closing Balance card (right)
  const cbX = M + balCardW + 6;
  doc.setFillColor(...BLUE_L);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(cbX, y, balCardW, balCardH, balRadius, balRadius, 'FD');
  // Left accent bar
  doc.setFillColor(...BLUE);
  doc.roundedRect(cbX, y, 3, balCardH, balRadius, balRadius, 'F');
  doc.rect(cbX + 1.5, y, 1.5, balCardH, 'F');
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('CLOSING BALANCE', cbX + 7, y + 7);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 112);
  doc.text(`As of ${fmtDate(to)}`, cbX + 7, y + 12.5);
  // Value
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE_D);
  doc.text(rupees(closeBal), cbX + balCardW - 4, y + 14, { align: 'right' });

  y += balCardH + 10;

  // ── 2. Financial Summary — minimal key-value rows ──────────────────────────
  y = sectionHeading('Financial Summary', y);

  const GREY     = [230, 230, 232];
  const DARK     = [30,  30,  40 ];
  const MID      = [100, 100, 112];
  const rowH     = 9;
  const colLabel = M;
  const colValue = pageW - M;

  const summaryRows = [
    { label: 'Total Income',  value: rupees(totalInc), color: GREEN_D, big: false },
    { label: 'Total Expense', value: rupees(totalExp), color: RED_D,   big: false },
    { label: 'Net Balance',   value: `${rupees(net)}  (${net >= 0 ? 'Surplus' : 'Deficit'})`,
      color: net >= 0 ? GREEN_D : RED_D, big: true },
    { label: 'Savings Rate',  value: `${report.summary.savings_rate}%`, color: DARK, big: false },
  ];

  summaryRows.forEach((row, i) => {
    const rh = row.big ? rowH + 4 : rowH;
    const ry = y + summaryRows.slice(0, i).reduce((s, r) => s + (r.big ? rowH + 4 : rowH), 0);

    // Alternating very light grey row tint
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 250);
      doc.rect(M, ry, pageW - M * 2, rh, 'F');
    }

    const fs = row.big ? 11 : 9;

    // Label
    doc.setFontSize(fs);
    doc.setFont('helvetica', row.big ? 'bold' : 'normal');
    doc.setTextColor(...MID);
    doc.text(row.label, colLabel, ry + rh / 2 + fs * 0.18);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...row.color);
    doc.text(row.value, colValue, ry + rh / 2 + fs * 0.18, { align: 'right' });
  });

  // Bottom border line
  const summaryBottom = y + summaryRows.reduce((s, r) => s + (r.big ? rowH + 4 : rowH), 0);
  doc.setDrawColor(...GREY);
  doc.setLineWidth(0.3);
  doc.line(M, y, M, summaryBottom);               // left edge
  doc.line(pageW - M, y, pageW - M, summaryBottom); // right edge
  doc.line(M, y, pageW - M, y);                   // top rule
  doc.line(M, summaryBottom, pageW - M, summaryBottom); // bottom rule

  y = summaryBottom + 10;

  // ── helper: draw a minimal section table (income / expense) ─────────────────
  const drawBreakdownSection = (items, total, labelKey, amtColor, headColor) => {
    const tRowH   = 8;
    const colName = M;
    const colTxn  = pageW - M - 40;
    const colAmt  = pageW - M;

    // Column header rule
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MID);
    doc.text(labelKey === 'source' ? 'Source' : 'Category', colName, y + 5);
    doc.text('Txns', colTxn, y + 5, { align: 'right' });
    doc.text('Amount', colAmt, y + 5, { align: 'right' });

    // Header underline
    doc.setDrawColor(...GREY);
    doc.setLineWidth(0.3);
    doc.line(M, y + 6.5, pageW - M, y + 6.5);
    y += 8;

    items.forEach((r, i) => {
      const amt      = nv(r.total);
      const pct      = total > 0 ? ((amt / total) * 100).toFixed(1) : '0.0';
      const nameVal  = labelKey === 'source' ? r.source : r.category;
      const txnVal   = String(r.count);

      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 250);
        doc.rect(M, y, pageW - M * 2, tRowH, 'F');
      }

      // Name + pct muted
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(nameVal, colName, y + 5.5);

      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text(`${pct}%`, colName + doc.setFontSize(8.5).getTextWidth(nameVal) + 3, y + 5.5);

      // Txn count
      doc.setFontSize(8.5);
      doc.setTextColor(...MID);
      doc.text(txnVal, colTxn, y + 5.5, { align: 'right' });

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...amtColor);
      doc.text(rupees(amt), colAmt, y + 5.5, { align: 'right' });

      // Row separator
      doc.setDrawColor(240, 240, 242);
      doc.setLineWidth(0.2);
      doc.line(M, y + tRowH, pageW - M, y + tRowH);

      y += tRowH;
    });

    // Total row
    const totalRowH = tRowH + 3;
    doc.setFillColor(245, 245, 248);
    doc.rect(M, y, pageW - M * 2, totalRowH, 'F');
    doc.setDrawColor(...GREY);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Total', colName, y + totalRowH / 2 + 1.8);

    doc.setTextColor(...amtColor);
    doc.text(rupees(total), colAmt, y + totalRowH / 2 + 1.8, { align: 'right' });

    doc.setDrawColor(...GREY);
    doc.line(M, y + totalRowH, pageW - M, y + totalRowH);

    y += totalRowH + 10;
  };

  // ── 3. Income by Source ──────────────────────────────────────────────────────
  if (report.income_by_source && report.income_by_source.length > 0) {
    if (y > 220) { doc.addPage(); drawHeader(); y = 44; }
    y = sectionHeading('Income by Source', y);
    drawBreakdownSection(report.income_by_source, totalInc, 'source', GREEN_D, GREEN);
  }

  // ── 4. Expense by Category ───────────────────────────────────────────────────
  if (report.expense_by_category && report.expense_by_category.length > 0) {
    if (y > 220) { doc.addPage(); drawHeader(); y = 44; }
    y = sectionHeading('Expense by Category', y);
    drawBreakdownSection(report.expense_by_category, totalExp, 'category', RED_D, RED);
  }

  // ── 5. Notes ─────────────────────────────────────────────────────────────────
  if (notes && notes.length > 0) {
    if (y > 230) { doc.addPage(); drawHeader(); y = 40; }
    y = sectionHeading(`Notes  (${notes.length})`, y);

    for (const note of notes) {
      // Each note rendered as a card with header + body
      const title    = note.title    || 'Untitled';
      const category = note.category || 'General';
      const content  = note.content  || '';
      const dateStr  = fmtNoteDate(note.created_at);

      // Wrap content text to measure height
      const contentLines = content
        ? doc.setFont('helvetica', 'normal').setFontSize(9)
            .splitTextToSize(content, pageW - M * 2 - 8)
        : [];

      const headerH  = 8;
      const bodyH    = contentLines.length > 0 ? contentLines.length * 4.8 + 8 : 10;
      const cardH    = headerH + bodyH;
      const cardGap  = 4;

      // Page break if card won't fit (leave 14 mm for footer)
      if (y + cardH > pageH - 14) { doc.addPage(); drawHeader(); y = 40; }

      const cardX = M;
      const cardW = pageW - M * 2;

      // Card border
      doc.setDrawColor(...NOTE_BD);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'S');

      // Card header band
      doc.setFillColor(...NOTE_BG);
      doc.roundedRect(cardX, y, cardW, headerH, 2, 2, 'F');
      // Mask bottom-rounded corners of header band (so it looks flat at bottom)
      doc.setFillColor(...NOTE_BG);
      doc.rect(cardX, y + headerH - 2, cardW, 2, 'F');

      // Header: left accent dot
      doc.setFillColor(...INDIGO);
      doc.circle(cardX + 4, y + headerH / 2, 1.2, 'F');

      // Header: title
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 80);
      doc.text(title, cardX + 8, y + 5.5);

      // Header: category pill (right-aligned)
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(99, 102, 241);
      doc.text(category, cardX + cardW - 4, y + 5.5, { align: 'right' });

      // Header: date (before category)
      doc.setTextColor(140, 140, 160);
      const dateTextW = doc.getTextWidth(category) + 4;
      doc.text(dateStr, cardX + cardW - dateTextW - 20, y + 5.5, { align: 'right' });

      // Body: content
      if (contentLines.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 80);
        doc.text(contentLines, cardX + 4, y + headerH + 5);
      } else {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(180, 180, 200);
        doc.text('No content', cardX + 4, y + headerH + 5);
      }

      y += cardH + cardGap;
    }
  }

  // ── Footer on every page ────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) drawFooter(i, totalPages);

  // ── Download ────────────────────────────────────────────────────────────────
  const filename = `MyPA_Report_${from}_to_${to}.pdf`;
  const blob = doc.output('blob');
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  return filename;
}

// ════════════════════════════════════════════════════════════════════════════
export default function PersonalReport() {
  const { user } = useSelector((state) => state.auth);
  const [from,    setFrom]    = useState(getFirstOfMonth());
  const [to,      setTo]      = useState(getToday());
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState('This Month');
  const [showAmounts, setShowAmounts] = useState(false);

  // Notes-modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pendingNotes,   setPendingNotes]   = useState([]);

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async (f = from, t = to) => {
    setLoading(true);
    try {
      const res = await individualApi.getReport({ from: f, to: t });
      setReport(res.data);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (preset) => {
    const range = preset.getRange();
    setActivePreset(preset.label);
    setFrom(range.from);
    setTo(range.to);
    setLoading(true);
    try {
      const res = await individualApi.getReport({ from: range.from, to: range.to });
      setReport(res.data);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) { toast.error('Generate the report first'); return; }
    // Fetch notes for the selected date range, then show confirm modal
    setGenerating(true);
    try {
      const res = await api.get('/notes', { params: { from, to, visible_only: 'true' } });
      const notes = res.data || [];
      setPendingNotes(notes);
      setShowNotesModal(true);
    } catch {
      toast.error('Failed to fetch notes');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmDownload = async (includeNotes) => {
    setShowNotesModal(false);
    setGenerating(true);
    try {
      const filename = await generatePDF(
        report,
        user?.name || 'User',
        from,
        to,
        includeNotes ? pendingNotes : [],
      );
      toast.success(`Downloaded: ${filename}`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error(`PDF failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const fmtCurUI = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const net = report?.summary?.net_balance ?? 0;
  const mask = (val) => showAmounts ? val : '••••••';

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">Analyse your income and expenses for any period</p>
        </div>
        <button
          onClick={() => setShowAmounts(v => !v)}
          className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 transition-all flex-shrink-0"
          style={{ background: '#e8edf5', boxShadow: showAmounts ? 'inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff' : '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}
          aria-label={showAmounts ? 'Hide amounts' : 'Show amounts'}
          title={showAmounts ? 'Hide amounts' : 'Show amounts'}
        >
          {showAmounts
            ? <HiOutlineEyeSlash className="w-5 h-5" />
            : <HiOutlineEye className="w-5 h-5" />
          }
        </button>
      </div>

      {/* ── Date range picker ── */}
      <div className="rounded-2xl" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
        {/* Presets */}
        <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3 border-b border-gray-200/60">
          {PRESET_RANGES.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activePreset === preset.label
                  ? 'text-indigo-700 font-semibold'
                  : 'text-gray-600'
              }`}
              style={activePreset === preset.label
                ? { background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }
                : { background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }
              }
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        <div className="flex flex-wrap gap-3 items-end px-4 py-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date" value={from}
              onChange={(e) => { setActivePreset(''); setFrom(e.target.value); }}
              className="input-field text-sm py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date" value={to}
              onChange={(e) => {
                setActivePreset('');
                const newTo = e.target.value;
                setTo(newTo);
                if (from && newTo && from <= newTo) {
                  fetchReport(from, newTo);
                }
              }}
              className="input-field text-sm py-1.5"
            />
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-1.5">
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          )}
          {report && !loading && (
            <button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="flex items-center gap-2 text-sm py-1.5 px-4 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              {generating
                ? <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : <HiOutlinePrinter className="w-4 h-4" />
              }
              {generating ? 'Generating...' : 'Print Report'}
            </button>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-14">
          <span className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Report content ── */}
      {!loading && report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Income',  value: mask(fmtCurUI(report.summary.total_income)),  icon: HiOutlineArrowTrendingUp,   color: 'text-green-600' },
              { label: 'Total Expense', value: mask(fmtCurUI(report.summary.total_expense)), icon: HiOutlineArrowTrendingDown,  color: 'text-red-600' },
              { label: 'Net Balance',   value: mask(fmtCurUI(net)),                           icon: HiOutlineBanknotes,          color: net >= 0 ? 'text-indigo-600' : 'text-orange-600' },
              { label: 'Savings Rate',  value: mask(`${report.summary.savings_rate}%`),       icon: HiOutlineCalculator,         color: 'text-purple-600' },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl p-5 flex items-center gap-3" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
                  <p className="text-base font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Income by source */}
            <div className="rounded-2xl p-5" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiOutlineArrowTrendingUp className="w-5 h-5 text-green-500" />
                Income by Source
              </h3>
              {report.income_by_source.length === 0 ? (
                <p className="text-sm text-gray-400">No income in this period</p>
              ) : (
                <div className="space-y-3">
                  {report.income_by_source.map((row) => {
                    const pct = report.summary.total_income > 0
                      ? ((row.total / report.summary.total_income) * 100).toFixed(0) : 0;
                    return (
                      <div key={row.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{row.source}</span>
                          <span className="font-semibold text-green-600">{mask(fmtCurUI(row.total))}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{pct}% · {row.count} transaction{row.count !== '1' && row.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                    <span className="text-gray-700">Total</span>
                    <span className="text-green-700">{mask(fmtCurUI(report.summary.total_income))}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expense by category */}
            <div className="rounded-2xl p-5" style={{ background: '#e8edf5', boxShadow: '6px 6px 12px #c8cfd8, -6px -6px 12px #ffffff' }}>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HiOutlineArrowTrendingDown className="w-5 h-5 text-red-500" />
                Expense by Category
              </h3>
              {report.expense_by_category.length === 0 ? (
                <p className="text-sm text-gray-400">No expenses in this period</p>
              ) : (
                <div className="space-y-3">
                  {report.expense_by_category.map((row) => {
                    const pct = report.summary.total_expense > 0
                      ? ((row.total / report.summary.total_expense) * 100).toFixed(0) : 0;
                    return (
                      <div key={row.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{row.category}</span>
                          <span className="font-semibold text-red-600">{mask(fmtCurUI(row.total))}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{pct}% · {row.count} transaction{row.count !== '1' && row.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                    <span className="text-gray-700">Total</span>
                    <span className="text-red-700">{mask(fmtCurUI(report.summary.total_expense))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Period footer */}
          <div className="flex items-center justify-between rounded-2xl px-5 py-3" style={{ background: '#e8edf5', boxShadow: '3px 3px 6px #c8cfd8, -3px -3px 6px #ffffff' }}>
            <p className="text-xs text-gray-500">
              Report period: <strong>{fmtDate(report.period.from)}</strong> to <strong>{fmtDate(report.period.to)}</strong>
            </p>
          </div>
        </>
      )}

      {/* ── Notes-in-PDF confirm modal ── */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <HiOutlinePencilSquare className="w-5 h-5 text-indigo-500" />
                Include Notes in PDF?
              </h2>
              <button onClick={() => setShowNotesModal(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {pendingNotes.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No notes found for this period (<strong>{fmtDate(from)}</strong> to <strong>{fmtDate(to)}</strong>).
                  The PDF will be downloaded without notes.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Found <strong>{pendingNotes.length}</strong> note{pendingNotes.length !== 1 ? 's' : ''} between{' '}
                  <strong>{fmtDate(from)}</strong> and <strong>{fmtDate(to)}</strong>.
                  Do you want to include them in the PDF?
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-5 pb-5">
              {pendingNotes.length === 0 ? (
                <button
                  onClick={() => handleConfirmDownload(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <HiOutlinePrinter className="w-4 h-4" />
                  Print Report
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleConfirmDownload(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Skip Notes
                  </button>
                  <button
                    onClick={() => handleConfirmDownload(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <HiOutlinePrinter className="w-4 h-4" />
                    Include &amp; Download
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
