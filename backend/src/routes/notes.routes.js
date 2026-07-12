const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');

router.use(authenticate);

// GET /api/notes — list all notes for the user (optional ?from=&to= date filters)
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { from, to, visible_only } = req.query;

    let query = 'SELECT * FROM personal_notes WHERE user_id = ?';
    const params = [req.user.id];

    if (from)         { query += ' AND DATE(created_at) >= ?'; params.push(from); }
    if (to)           { query += ' AND DATE(created_at) <= ?'; params.push(to); }
    if (visible_only === 'true') { query += ' AND visible = 1'; }

    query += ' ORDER BY pinned DESC, updated_at DESC';

    const [rows] = await pool.query(query, params);
    return ApiResponse.success(res, rows);
  } catch (err) { next(err); }
});

// POST /api/notes — create a note
router.post('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { title = 'Untitled', content = '', color = 'yellow', pinned = false, category = 'General', visible = true } = req.body;
    const [result] = await pool.query(
      'INSERT INTO personal_notes (user_id, title, content, color, pinned, category, visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, content, color, pinned ? 1 : 0, category, visible ? 1 : 0]
    );
    const [[note]] = await pool.query('SELECT * FROM personal_notes WHERE id = ?', [result.insertId]);
    return ApiResponse.created(res, note, 'Note created');
  } catch (err) { next(err); }
});

// PUT /api/notes/:id — update a note
router.put('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { title, content, color, pinned, category, visible } = req.body;
    const fields = [];
    const params = [];
    if (title    !== undefined) { fields.push('title = ?');    params.push(title); }
    if (content  !== undefined) { fields.push('content = ?');  params.push(content); }
    if (color    !== undefined) { fields.push('color = ?');    params.push(color); }
    if (pinned   !== undefined) { fields.push('pinned = ?');   params.push(pinned ? 1 : 0); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (visible  !== undefined) { fields.push('visible = ?');  params.push(visible ? 1 : 0); }
    if (fields.length === 0) return ApiResponse.error(res, 'Nothing to update', 400);
    params.push(req.params.id, req.user.id);
    await pool.query(
      `UPDATE personal_notes SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params
    );
    const [[note]] = await pool.query('SELECT * FROM personal_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) return ApiResponse.notFound(res, 'Note not found');
    return ApiResponse.success(res, note, 'Note updated');
  } catch (err) { next(err); }
});

// DELETE /api/notes/:id — delete a note
router.delete('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM personal_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return ApiResponse.success(res, null, 'Note deleted');
  } catch (err) { next(err); }
});

module.exports = router;
