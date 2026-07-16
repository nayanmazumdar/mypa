const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { getPool } = require('../config/db');
const { authenticate, permit } = require('../middlewares/auth.middleware');
const ApiResponse = require('../utils/response');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const EXPORTABLE = {
  products: {
    query: `SELECT p.id, p.name, p.sku, p.barcode, p.selling_price, p.purchase_price, p.mrp,
            p.unit, p.brand, p.weight, p.description, p.is_active,
            c.name as category_name, COALESCE(i.quantity, 0) as stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN inventory i ON p.id = i.product_id AND i.shop_id = p.shop_id
            WHERE p.shop_id = ?`,
    permission: 'products:read',
    importTable: 'products',
  },
  customers: {
    query: `SELECT id, name, phone, email, address, balance, is_active, created_at
            FROM customers WHERE shop_id = ?`,
    permission: 'customers:read',
    importTable: 'customers',
  },
  suppliers: {
    query: `SELECT id, name, phone, email, address, gst_number, is_active, created_at
            FROM suppliers WHERE shop_id = ?`,
    permission: 'suppliers:read',
    importTable: 'suppliers',
  },
  sales: {
    query: `SELECT s.id, s.invoice_number, s.sale_date, s.total_amount, s.discount,
            s.net_amount, s.payment_method, s.payment_status, s.status,
            c.name as customer_name, s.notes, s.created_at
            FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.shop_id = ? ORDER BY s.created_at DESC`,
    permission: 'sales:read',
  },
  purchases: {
    query: `SELECT p.id, p.invoice_number, p.purchase_date, p.total_amount, p.discount,
            p.net_amount, p.payment_method, p.payment_status, p.status,
            s.name as supplier_name, p.notes, p.created_at
            FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.shop_id = ? ORDER BY p.created_at DESC`,
    permission: 'purchases:read',
  },
  transactions: {
    query: `SELECT t.id, t.receipt_number, t.customer_name, t.total_amount, t.discount,
            t.net_amount, t.payment_method, t.amount_received, t.change_amount, t.created_at
            FROM pos_transactions t WHERE t.shop_id = ? ORDER BY t.created_at DESC`,
    permission: 'pos:read',
  },
  expenses: {
    query: `SELECT id, category, description, amount, payment_method, expense_date, created_at
            FROM expenses WHERE shop_id = ?`,
    permission: 'expenses:read',
  },
  inventory: {
    query: `SELECT p.id as product_id, p.name, p.sku, p.barcode,
            COALESCE(i.quantity, 0) as stock, COALESCE(i.min_stock_level, 0) as min_stock_level,
            p.selling_price, p.purchase_price
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id AND i.shop_id = p.shop_id
            WHERE p.shop_id = ? AND p.is_active = 1`,
    permission: 'inventory:read',
  },
};

/**
 * GET /api/export/:entity?format=xlsx|csv|json
 */
router.get('/:entity', authenticate, async (req, res, next) => {
  try {
    const { entity } = req.params;
    const format = (req.query.format || 'xlsx').toLowerCase();
    const config = EXPORTABLE[entity];

    if (!config) {
      return ApiResponse.error(res, `Unknown entity: ${entity}. Available: ${Object.keys(EXPORTABLE).join(', ')}`, 400);
    }

    // Permission check
    const { PERMISSIONS } = require('../middlewares/auth.middleware');
    const allowedRoles = PERMISSIONS[config.permission];
    if (!allowedRoles || !allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Permission denied', 403);
    }

    const pool = getPool();
    const [rows] = await pool.query(config.query, [req.user.shop_id]);

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_export.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.json({ entity, exported_at: new Date().toISOString(), count: rows.length, data: rows });
    }

    if (format === 'csv') {
      if (rows.length === 0) {
        res.setHeader('Content-Disposition', `attachment; filename="${entity}_export.csv"`);
        res.setHeader('Content-Type', 'text/csv');
        return res.send('No data');
      }
      const headers = Object.keys(rows[0]);
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        const line = headers.map(h => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',');
        csvLines.push(line);
      }
      res.setHeader('Content-Disposition', `attachment; filename="${entity}_export.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvLines.join('\n'));
    }

    // Default: Excel (xlsx)
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MyPA';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(entity.charAt(0).toUpperCase() + entity.slice(1));

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      sheet.columns = headers.map(h => ({ header: h.replace(/_/g, ' ').toUpperCase(), key: h, width: 18 }));
      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } };
      rows.forEach(row => sheet.addRow(row));
    }

    res.setHeader('Content-Disposition', `attachment; filename="${entity}_export.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
});

/**
 * POST /api/import/:entity — Import data from Excel/CSV/JSON
 */
router.post('/:entity', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const { entity } = req.params;
    const config = EXPORTABLE[entity];
    if (!config || !config.importTable) {
      return ApiResponse.error(res, `Import not supported for: ${entity}`, 400);
    }

    // Only admin can import
    if (req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Only admin can import data', 403);
    }

    if (!req.file) {
      return ApiResponse.error(res, 'File is required', 400);
    }

    const pool = getPool();
    let rows = [];
    const filename = req.file.originalname.toLowerCase();

    if (filename.endsWith('.json')) {
      const json = JSON.parse(req.file.buffer.toString('utf8'));
      rows = json.data || json;
    } else if (filename.endsWith('.csv')) {
      const csvText = req.file.buffer.toString('utf8');
      const lines = csvText.split('\n').filter(l => l.trim());
      if (lines.length < 2) return ApiResponse.error(res, 'CSV file is empty', 400);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || null; });
        rows.push(row);
      }
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount < 2) return ApiResponse.error(res, 'Excel file is empty', 400);
      const headers = [];
      sheet.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/\s+/g, '_'));
      });
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = {};
        const excelRow = sheet.getRow(i);
        headers.forEach((h, idx) => { row[h] = excelRow.getCell(idx + 1).value; });
        if (Object.values(row).some(v => v !== null && v !== '')) rows.push(row);
      }
    } else {
      return ApiResponse.error(res, 'Unsupported file format. Use .xlsx, .csv, or .json', 400);
    }

    if (rows.length === 0) return ApiResponse.error(res, 'No data found in file', 400);

    // Import based on entity type
    let imported = 0, skipped = 0;

    if (entity === 'products') {
      for (const row of rows) {
        if (!row.name) { skipped++; continue; }
        try {
          const [existing] = await pool.query(
            'SELECT id FROM products WHERE shop_id = ? AND (name = ? OR (barcode IS NOT NULL AND barcode = ?))',
            [req.user.shop_id, row.name, row.barcode || '']
          );
          if (existing.length > 0) { skipped++; continue; }
          await pool.query(
            `INSERT INTO products (shop_id, name, sku, barcode, selling_price, purchase_price, mrp, unit, brand, weight, description, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [req.user.shop_id, row.name, row.sku || null, row.barcode || null,
             parseFloat(row.selling_price) || 0, parseFloat(row.purchase_price) || 0,
             parseFloat(row.mrp) || null, row.unit || 'pc', row.brand || null,
             row.weight || null, row.description || null]
          );
          imported++;
        } catch { skipped++; }
      }
    } else if (entity === 'customers') {
      for (const row of rows) {
        if (!row.name) { skipped++; continue; }
        try {
          const [existing] = await pool.query(
            'SELECT id FROM customers WHERE shop_id = ? AND (name = ? OR (phone IS NOT NULL AND phone = ?))',
            [req.user.shop_id, row.name, row.phone || '']
          );
          if (existing.length > 0) { skipped++; continue; }
          await pool.query(
            `INSERT INTO customers (shop_id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
            [req.user.shop_id, row.name, row.phone || null, row.email || null, row.address || null]
          );
          imported++;
        } catch { skipped++; }
      }
    } else if (entity === 'suppliers') {
      for (const row of rows) {
        if (!row.name) { skipped++; continue; }
        try {
          const [existing] = await pool.query(
            'SELECT id FROM suppliers WHERE shop_id = ? AND name = ?',
            [req.user.shop_id, row.name]
          );
          if (existing.length > 0) { skipped++; continue; }
          await pool.query(
            `INSERT INTO suppliers (shop_id, name, phone, email, address, gst_number) VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.shop_id, row.name, row.phone || null, row.email || null, row.address || null, row.gst_number || null]
          );
          imported++;
        } catch { skipped++; }
      }
    }

    return ApiResponse.success(res, { imported, skipped, total: rows.length }, `Imported ${imported} records, skipped ${skipped}`);
  } catch (error) { next(error); }
});

module.exports = router;
