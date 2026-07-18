/**
 * notification.service.js
 * Handles email & WhatsApp notification sending, templates, and settings.
 */
const { getPool } = require('../config/db');
const logger = require('../config/logger');
const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');

class NotificationService {

  // ─── SETTINGS ─────────────────────────────────────────────

  async getSettings(shopId) {
    const pool = getPool();
    const [[settings]] = await pool.query(
      'SELECT * FROM notification_settings WHERE shop_id = ?', [shopId]
    );
    if (settings) {
      settings.smtp_password = settings.smtp_password ? '••••••••' : null;
      settings.whatsapp_api_key = settings.whatsapp_api_key ? '••••••••' : null;
      settings.sms_api_key = settings.sms_api_key ? '••••••••' : null;
    }
    return settings || null;
  }

  async saveSettings(shopId, data) {
    const pool = getPool();
    const {
      email_enabled, smtp_host, smtp_port, smtp_user, smtp_password,
      smtp_from_email, smtp_from_name, smtp_secure,
      whatsapp_enabled, whatsapp_api_url, whatsapp_api_key, whatsapp_from_number,
      sms_enabled, sms_api_url, sms_api_key, sms_sender_id, sms_provider,
      notify_on_sale, notify_on_purchase, notify_on_payment_due, notify_on_credit_reminder,
    } = data;

    // Check if settings exist
    const [[existing]] = await pool.query('SELECT id, smtp_password, whatsapp_api_key, sms_api_key FROM notification_settings WHERE shop_id = ?', [shopId]);

    // If password/keys are masked or empty, keep existing
    const finalSmtpPass = (!smtp_password || smtp_password === '••••••••') ? (existing?.smtp_password || null) : smtp_password;
    const finalWaKey    = (!whatsapp_api_key || whatsapp_api_key === '••••••••') ? (existing?.whatsapp_api_key || null) : whatsapp_api_key;
    const finalSmsKey   = (!sms_api_key || sms_api_key === '••••••••') ? (existing?.sms_api_key || null) : sms_api_key;

    if (existing) {
      await pool.query(
        `UPDATE notification_settings SET
          email_enabled=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_password=?,
          smtp_from_email=?, smtp_from_name=?, smtp_secure=?,
          whatsapp_enabled=?, whatsapp_api_url=?, whatsapp_api_key=?, whatsapp_from_number=?,
          sms_enabled=?, sms_api_url=?, sms_api_key=?, sms_sender_id=?, sms_provider=?,
          notify_on_sale=?, notify_on_purchase=?, notify_on_payment_due=?, notify_on_credit_reminder=?
        WHERE shop_id=?`,
        [
          email_enabled ? 1 : 0, smtp_host || null, smtp_port || 587, smtp_user || null, finalSmtpPass,
          smtp_from_email || null, smtp_from_name || null, smtp_secure || 'tls',
          whatsapp_enabled ? 1 : 0, whatsapp_api_url || null, finalWaKey, whatsapp_from_number || null,
          sms_enabled ? 1 : 0, sms_api_url || null, finalSmsKey, sms_sender_id || null, sms_provider || 'generic',
          notify_on_sale ? 1 : 0, notify_on_purchase ? 1 : 0, notify_on_payment_due ? 1 : 0, notify_on_credit_reminder ? 1 : 0,
          shopId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO notification_settings (shop_id, email_enabled, smtp_host, smtp_port, smtp_user, smtp_password,
          smtp_from_email, smtp_from_name, smtp_secure,
          whatsapp_enabled, whatsapp_api_url, whatsapp_api_key, whatsapp_from_number,
          sms_enabled, sms_api_url, sms_api_key, sms_sender_id, sms_provider,
          notify_on_sale, notify_on_purchase, notify_on_payment_due, notify_on_credit_reminder)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          shopId,
          email_enabled ? 1 : 0, smtp_host || null, smtp_port || 587, smtp_user || null, finalSmtpPass,
          smtp_from_email || null, smtp_from_name || null, smtp_secure || 'tls',
          whatsapp_enabled ? 1 : 0, whatsapp_api_url || null, finalWaKey, whatsapp_from_number || null,
          sms_enabled ? 1 : 0, sms_api_url || null, finalSmsKey, sms_sender_id || null, sms_provider || 'generic',
          notify_on_sale ? 1 : 0, notify_on_purchase ? 1 : 0, notify_on_payment_due ? 1 : 0, notify_on_credit_reminder ? 1 : 0,
        ]
      );
    }
    logger.info(`Notification settings saved for shop ${shopId}`);
  }

  async testEmail(shopId) {
    const pool = getPool();
    const [[settings]] = await pool.query('SELECT * FROM notification_settings WHERE shop_id = ?', [shopId]);
    if (!settings || !settings.email_enabled) throw Object.assign(new Error('Email not configured'), { statusCode: 400 });

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure === 'ssl',
      auth: { user: settings.smtp_user, pass: settings.smtp_password },
    });

    await transporter.sendMail({
      from: `"${settings.smtp_from_name || 'MyPA'}" <${settings.smtp_from_email}>`,
      to: settings.smtp_from_email,
      subject: 'Test Email from MyPA',
      text: 'This is a test email from your MyPA notification system. If you received this, email is configured correctly!',
    });
    return { success: true };
  }

  // ─── TEMPLATES ────────────────────────────────────────────

  async getTemplates(shopId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM notification_templates
       WHERE (shop_id = ? OR shop_id IS NULL) AND is_active = 1
       ORDER BY type, channel`,
      [shopId]
    );
    return rows;
  }

  async saveTemplate(shopId, { type, channel, subject, body }) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO notification_templates (shop_id, type, channel, subject, body)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE subject=VALUES(subject), body=VALUES(body)`,
      [shopId, type, channel, subject || null, body]
    );
  }

  // ─── SEND NOTIFICATIONS ───────────────────────────────────

  /**
   * Send sale invoice notification to customer.
   * Called after a successful POS checkout.
   */
  async sendSaleNotification(shopId, saleData) {
    const pool = getPool();
    const [[settings]] = await pool.query('SELECT * FROM notification_settings WHERE shop_id = ?', [shopId]);
    if (!settings || !settings.notify_on_sale) return;

    const [[shop]] = await pool.query('SELECT name, phone FROM shops WHERE id = ?', [shopId]);
    if (!saleData.customer_email && !saleData.customer_phone) return;

    const vars = {
      shop_name: shop?.name || 'Shop',
      shop_phone: shop?.phone || '',
      customer_name: saleData.customer_name || 'Customer',
      receipt_number: saleData.receipt_number || '',
      date: new Date().toLocaleDateString('en-IN'),
      total_amount: saleData.net_amount?.toFixed(2) || '0',
      payment_method: saleData.payment_method || 'cash',
      items_list: (saleData.items || []).map(i => `• ${i.product_name} x${i.quantity} = ₹${(i.quantity * i.unit_price).toFixed(2)}`).join('\n'),
    };

    // Send email
    if (settings.email_enabled && saleData.customer_email) {
      this._sendEmail(settings, shopId, saleData.customer_id, 'sale_invoice', saleData.customer_email, vars);
    }

    // Send WhatsApp
    if (settings.whatsapp_enabled && saleData.customer_phone) {
      this._sendWhatsApp(settings, shopId, saleData.customer_id, 'sale_invoice', saleData.customer_phone, vars);
    }

    // Send SMS
    if (settings.sms_enabled && saleData.customer_phone) {
      this._sendSms(settings, shopId, saleData.customer_id, 'sale_invoice', saleData.customer_phone, vars);
    }
  }

  /**
   * Send payment due / credit reminder to a customer.
   */
  async sendDueReminder(shopId, { customerId, customerName, customerEmail, customerPhone, dueAmount, lastDate, type = 'payment_due' }) {
    const pool = getPool();
    const [[settings]] = await pool.query('SELECT * FROM notification_settings WHERE shop_id = ?', [shopId]);
    if (!settings) return;
    if (type === 'payment_due' && !settings.notify_on_payment_due) return;
    if (type === 'credit_reminder' && !settings.notify_on_credit_reminder) return;

    const [[shop]] = await pool.query('SELECT name, phone FROM shops WHERE id = ?', [shopId]);

    const vars = {
      shop_name: shop?.name || 'Shop',
      shop_phone: shop?.phone || '',
      customer_name: customerName || 'Customer',
      due_amount: dueAmount?.toFixed(2) || '0',
      last_date: lastDate || new Date().toLocaleDateString('en-IN'),
    };

    if (settings.email_enabled && customerEmail) {
      this._sendEmail(settings, shopId, customerId, type, customerEmail, vars);
    }
    if (settings.whatsapp_enabled && customerPhone) {
      this._sendWhatsApp(settings, shopId, customerId, type, customerPhone, vars);
    }
    if (settings.sms_enabled && customerPhone) {
      this._sendSms(settings, shopId, customerId, type, customerPhone, vars);
    }
  }

  // ─── NOTIFICATION LOG ─────────────────────────────────────

  async getLogs(shopId, { limit = 50, offset = 0, channel, status } = {}) {
    const pool = getPool();
    let sql = 'SELECT * FROM notification_logs WHERE shop_id = ?';
    const params = [shopId];
    if (channel) { sql += ' AND channel = ?'; params.push(channel); }
    if (status)  { sql += ' AND status = ?';  params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  // ─── INTERNAL HELPERS ─────────────────────────────────────

  async _sendEmail(settings, shopId, customerId, type, to, vars) {
    const pool = getPool();
    try {
      const template = await this._getTemplate(shopId, type, 'email');
      const subject = this._renderTemplate(template?.subject || `Notification from ${vars.shop_name}`, vars);
      const body = this._renderTemplate(template?.body || '', vars);

      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: settings.smtp_secure === 'ssl',
        auth: { user: settings.smtp_user, pass: settings.smtp_password },
      });

      await transporter.sendMail({
        from: `"${settings.smtp_from_name || 'MyPA'}" <${settings.smtp_from_email}>`,
        to,
        subject,
        text: body,
      });

      await pool.query(
        'INSERT INTO notification_logs (shop_id, customer_id, channel, type, recipient, subject, body, status) VALUES (?,?,?,?,?,?,?,?)',
        [shopId, customerId, 'email', type, to, subject, body, 'sent']
      );
      logger.info(`Email sent: ${type} to ${to} (shop ${shopId})`);
    } catch (err) {
      await pool.query(
        'INSERT INTO notification_logs (shop_id, customer_id, channel, type, recipient, subject, status, error) VALUES (?,?,?,?,?,?,?,?)',
        [shopId, customerId, 'email', type, to, type, 'failed', err.message]
      );
      logger.error(`Email failed: ${type} to ${to} — ${err.message}`);
    }
  }

  async _sendWhatsApp(settings, shopId, customerId, type, phone, vars) {
    const pool = getPool();
    try {
      const template = await this._getTemplate(shopId, type, 'whatsapp');
      const body = this._renderTemplate(template?.body || '', vars);

      // Generic WhatsApp API call (works with most providers like WATI, Twilio, etc.)
      const url = new URL(settings.whatsapp_api_url);
      const payload = JSON.stringify({
        to: phone.replace(/[^0-9]/g, ''),
        message: body,
        from: settings.whatsapp_from_number,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.whatsapp_api_key}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      await new Promise((resolve, reject) => {
        const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => res.statusCode < 400 ? resolve(data) : reject(new Error(`API ${res.statusCode}: ${data}`)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      await pool.query(
        'INSERT INTO notification_logs (shop_id, customer_id, channel, type, recipient, body, status) VALUES (?,?,?,?,?,?,?)',
        [shopId, customerId, 'whatsapp', type, phone, body, 'sent']
      );
      logger.info(`WhatsApp sent: ${type} to ${phone} (shop ${shopId})`);
    } catch (err) {
      await pool.query(
        'INSERT INTO notification_logs (shop_id, customer_id, channel, type, recipient, status, error) VALUES (?,?,?,?,?,?,?)',
        [shopId, customerId, 'whatsapp', type, phone, 'failed', err.message]
      );
      logger.error(`WhatsApp failed: ${type} to ${phone} — ${err.message}`);
    }
  }

  async _sendSms(settings, shopId, customerId, type, phone, vars) {
    const pool = getPool();
    try {
      const template = await this._getTemplate(shopId, type, 'sms');
      const body = this._renderTemplate(template?.body || '', vars);
      const cleanPhone = phone.replace(/[^0-9+]/g, '');

      // Generic SMS API call (works with most providers)
      const url = new URL(settings.sms_api_url);
      const payload = JSON.stringify({
        to: cleanPhone,
        message: body,
        sender: settings.sms_sender_id,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.sms_api_key}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      await new Promise((resolve, reject) => {
        const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => res.statusCode < 400 ? resolve(data) : reject(new Error(`SMS API ${res.statusCode}: ${data}`)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      await pool.query(
        'INSERT INTO notification_logs (shop_id, customer_id, channel, type, recipient, body, status) VALUES (?,?,?,?,?,?,?)',
        [shopId, customerId, 'sms', type, cleanPhone, body, 'sent']
      );
      logger.info(`SMS sent: ${type} to ${cleanPhone} (shop ${shopId})`);
    } catch (err) {
      await pool.query(
        'INSERT INTO notification_logs (shop_id, customer_id, channel, type, recipient, status, error) VALUES (?,?,?,?,?,?,?)',
        [shopId, customerId, 'sms', type, phone, 'failed', err.message]
      );
      logger.error(`SMS failed: ${type} to ${phone} — ${err.message}`);
    }
  }

  async _getTemplate(shopId, type, channel) {
    const pool = getPool();
    // Prefer shop-specific, fall back to global
    const [[template]] = await pool.query(
      `SELECT * FROM notification_templates
       WHERE type = ? AND channel = ? AND (shop_id = ? OR shop_id IS NULL) AND is_active = 1
       ORDER BY shop_id DESC LIMIT 1`,
      [type, channel, shopId]
    );
    return template;
  }

  _renderTemplate(template, vars) {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
  }
}

module.exports = new NotificationService();
