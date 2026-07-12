import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlinePencilSquare, HiOutlineTrash, HiOutlinePlus,
  HiOutlineXMark, HiOutlineCheck, HiOutlineStar,
  HiOutlineEye, HiOutlineEyeSlash, HiOutlineTag,
} from 'react-icons/hi2';
import api from '../../api/axios';

// ── Colour palette ────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { key: 'yellow', bg: 'bg-yellow-50',  border: 'border-yellow-200', header: 'bg-yellow-100', dot: 'bg-yellow-400' },
  { key: 'blue',   bg: 'bg-blue-50',    border: 'border-blue-200',   header: 'bg-blue-100',   dot: 'bg-blue-400' },
  { key: 'green',  bg: 'bg-green-50',   border: 'border-green-200',  header: 'bg-green-100',  dot: 'bg-green-400' },
  { key: 'pink',   bg: 'bg-pink-50',    border: 'border-pink-200',   header: 'bg-pink-100',   dot: 'bg-pink-400' },
  { key: 'purple', bg: 'bg-purple-50',  border: 'border-purple-200', header: 'bg-purple-100', dot: 'bg-purple-400' },
  { key: 'orange', bg: 'bg-orange-50',  border: 'border-orange-200', header: 'bg-orange-100', dot: 'bg-orange-400' },
];
const colorOf = (key) => NOTE_COLORS.find(c => c.key === key) || NOTE_COLORS[0];

// ── Categories ────────────────────────────────────────────────────────────────
const NOTE_CATEGORIES = [
  'General', 'Personal', 'Work', 'Ideas', 'Shopping', 'Finance',
  'Health', 'Travel', 'Reminders', 'Goals', 'Other',
];

const EMPTY_FORM = { title: '', content: '', color: 'yellow', pinned: false, category: 'General', visible: true };

// ── Category badge colour map ─────────────────────────────────────────────────
const CAT_COLORS = {
  General:   'bg-gray-100 text-gray-600',
  Personal:  'bg-violet-100 text-violet-700',
  Work:      'bg-blue-100 text-blue-700',
  Ideas:     'bg-amber-100 text-amber-700',
  Shopping:  'bg-pink-100 text-pink-700',
  Finance:   'bg-green-100 text-green-700',
  Health:    'bg-red-100 text-red-700',
  Travel:    'bg-cyan-100 text-cyan-700',
  Reminders: 'bg-orange-100 text-orange-700',
  Goals:     'bg-indigo-100 text-indigo-700',
  Other:     'bg-gray-100 text-gray-500',
};

// ═════════════════════════════════════════════════════════════════════════════
export default function PersonalNotes() {
  const [notes,       setNotes]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('All');

  const today         = new Date().toISOString().split('T')[0];
  const firstOfMonth  = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');

  const load = async (from = dateFrom, to = dateTo) => {
    try {
      const params = {};
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await api.get('/notes', { params });
      setNotes(res.data || []);
    } catch { toast.error('Failed to load notes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Reload when date range changes
  useEffect(() => {
    if (!dateFrom && !dateTo) return; // skip on initial empty state
    setLoading(true);
    load(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  const openNew = () => { setEditingNote(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (note) => {
    setEditingNote(note);
    setForm({
      title: note.title, content: note.content || '',
      color: note.color || 'yellow', pinned: !!note.pinned,
      category: note.category || 'General', visible: note.visible !== false,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const wordCount = form.content.trim() === '' ? 0 : form.content.trim().split(/\s+/).length;
    if (wordCount > 100) { toast.error('Note exceeds 100 word limit'); return; }
    setSaving(true);
    try {
      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, form);
        toast.success('Note updated');
      } else {
        await api.post('/notes', form);
        toast.success('Note saved');
      }
      setShowModal(false);
      load(dateFrom, dateTo);
    } catch (err) {
      toast.error(err.structured?.message || 'Failed to save note');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/notes/${id}`);
      toast.success('Note deleted');
      setNotes(n => n.filter(x => x.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const togglePin = async (note) => {
    try { await api.put(`/notes/${note.id}`, { pinned: !note.pinned }); load(dateFrom, dateTo); }
    catch { toast.error('Failed to update'); }
  };

  const toggleVisible = async (note) => {
    try { await api.put(`/notes/${note.id}`, { visible: !note.visible }); load(dateFrom, dateTo); }
    catch { toast.error('Failed to update'); }
  };

  // Unique categories from existing notes
  const usedCats = ['All', ...Array.from(new Set(notes.map(n => n.category || 'General')))];

  const filtered = notes
    .filter(n => filterCat === 'All' || (n.category || 'General') === filterCat)
    .filter(n =>
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(search.toLowerCase())
    );

  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors">
          <HiOutlinePlus className="w-4 h-4" /> New Note
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text" placeholder="Search notes…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 min-w-48 text-sm py-1.5"
        />
        {/* Date range */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-xs text-gray-400 shrink-0">From</span>
          <input
            type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs text-gray-700 outline-none bg-transparent"
          />
          <span className="text-xs text-gray-400 shrink-0 mx-1">—</span>
          <span className="text-xs text-gray-400 shrink-0">To</span>
          <input
            type="date" value={dateTo}
            max={today}
            onChange={e => setDateTo(e.target.value)}
            className="text-xs text-gray-700 outline-none bg-transparent"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setLoading(true); load('', ''); }}
              className="ml-1 text-gray-400 hover:text-gray-600"
              title="Clear dates"
            >
              ×
            </button>
          )}
        </div>
        {/* Quick presets */}
        <div className="flex gap-1">
          {[
            { label: 'This month', from: firstOfMonth, to: today },
            { label: 'Today',      from: today,        to: today },
          ].map(p => (
            <button key={p.label}
              onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                dateFrom === p.from && dateTo === p.to
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {usedCats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCat === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notes grid ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20">
          <HiOutlinePencilSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No notes yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "New Note" to jot something down</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No notes match your filters.</div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <HiOutlineStar className="w-3.5 h-3.5" /> Pinned
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pinned.map(note => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} onToggleVisible={toggleVisible} />
                ))}
              </div>
            </div>
          )}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-6">Other</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {unpinned.map(note => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} onToggleVisible={toggleVisible} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

            {/* Modal header */}
            <div className={`flex items-center justify-between px-5 py-4 rounded-t-2xl ${colorOf(form.color).header}`}>
              <h2 className="text-base font-semibold text-gray-800">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">

              {/* Title */}
              <input
                type="text" required placeholder="Title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="input-field font-medium"
              />

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <HiOutlineTag className="w-3.5 h-3.5" /> Select Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_CATEGORIES.map(cat => (
                    <button
                      key={cat} type="button"
                      onClick={() => setForm({ ...form, category: cat })}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.category === cat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              {(() => {
                const wordCount = form.content.trim() === '' ? 0 : form.content.trim().split(/\s+/).length;
                const remaining = 100 - wordCount;
                const isOver    = wordCount > 100;
                return (
                  <div>
                    <textarea
                      rows={5} placeholder="Write your note here… (max 100 words)"
                      value={form.content}
                      onChange={e => {
                        const val = e.target.value;
                        const words = val.trim() === '' ? [] : val.trim().split(/\s+/);
                        if (words.length <= 100) {
                          setForm({ ...form, content: val });
                        } else {
                          setForm({ ...form, content: words.slice(0, 100).join(' ') });
                        }
                      }}
                      className={`input-field resize-none w-full ${isOver ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                    <div className="flex items-center justify-between mt-1 px-0.5">
                      <span className="text-[11px] text-gray-400">Max 100 words</span>
                      <span className={`text-[11px] font-semibold ${
                        isOver ? 'text-red-500' : remaining <= 10 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {wordCount} / 100 words
                        {remaining <= 10 && !isOver && ` — ${remaining} left`}
                        {isOver && ' — limit reached'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Colour picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Color:</span>
                {NOTE_COLORS.map(c => (
                  <button key={c.key} type="button"
                    onClick={() => setForm({ ...form, color: c.key })}
                    className={`w-6 h-6 rounded-full ${c.dot} border-2 transition-transform ${
                      form.color === c.key ? 'border-gray-800 scale-125' : 'border-transparent'
                    }`} />
                ))}
              </div>

              {/* Pin + Visible/Hidden toggle */}
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={form.pinned}
                    onChange={e => setForm({ ...form, pinned: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600" />
                  <HiOutlineStar className="w-4 h-4 text-amber-500" /> Pin this note
                </label>

                {/* Visible / Hidden toggle buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  <button type="button"
                    onClick={() => setForm({ ...form, visible: true })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      form.visible
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    <HiOutlineEye className="w-3.5 h-3.5" /> Visible
                  </button>
                  <button type="button"
                    onClick={() => setForm({ ...form, visible: false })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      !form.visible
                        ? 'bg-gray-700 text-white border-gray-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    <HiOutlineEyeSlash className="w-3.5 h-3.5" /> Hidden
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <HiOutlineCheck className="w-4 h-4" />
                  }
                  {saving ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onPin, onToggleVisible }) {
  const c   = colorOf(note.color);
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const catColor = CAT_COLORS[note.category] || CAT_COLORS.Other;
  const isHidden = note.visible === false;

  return (
    <div className={`rounded-xl border flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow ${c.bg} ${c.border}`}>

      {/* Card header */}
      <div className={`flex items-center justify-between px-3 py-2 ${c.header}`}>
        <p className="text-sm font-semibold text-gray-800 truncate flex-1">{note.title}</p>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button onClick={() => onPin(note)}
            className={`p-1 rounded hover:bg-black/10 transition-colors ${note.pinned ? 'text-amber-500' : 'text-gray-400'}`}
            title={note.pinned ? 'Unpin' : 'Pin'}>
            <HiOutlineStar className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onToggleVisible(note)}
            className={`p-1 rounded hover:bg-black/10 transition-colors ${isHidden ? 'text-gray-700' : 'text-gray-400'}`}
            title={isHidden ? 'Make visible' : 'Mark as private'}>
            {isHidden ? <HiOutlineEyeSlash className="w-3.5 h-3.5" /> : <HiOutlineEye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(note)} className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-black/10" title="Edit">
            <HiOutlinePencilSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(note.id, note.title)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-black/10" title="Delete">
            <HiOutlineTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content — blurred when private */}
      <div className="px-3 py-3 flex-1 relative">
        {isHidden ? (
          <>
            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6 blur-sm select-none">
              {note.content || 'Private note content hidden'}
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-1 bg-gray-800/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <HiOutlineEyeSlash className="w-3 h-3" /> Private
              </span>
            </div>
          </>
        ) : note.content ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{note.content}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">No content</p>
        )}
      </div>

      {/* Footer: category + date */}
      <div className="px-3 py-2 border-t border-black/5 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
          {note.category || 'General'}
        </span>
        <p className="text-[10px] text-gray-400 shrink-0">{fmt(note.updated_at)}</p>
      </div>
    </div>
  );
}
