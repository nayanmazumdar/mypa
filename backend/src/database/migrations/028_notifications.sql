-- 028_notifications.sql
-- Notification configuration & history for email and WhatsApp

-- Shop-level notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id     INT NOT NULL,
  
  -- Email config
  email_enabled       TINYINT(1) NOT NULL DEFAULT 0,
  smtp_host           VARCHAR(255) DEFAULT NULL,
  smtp_port           INT DEFAULT 587,
  smtp_user           VARCHAR(255) DEFAULT NULL,
  smtp_password       VARCHAR(255) DEFAULT NULL,
  smtp_from_email     VARCHAR(255) DEFAULT NULL,
  smtp_from_name      VARCHAR(100) DEFAULT NULL,
  smtp_secure         ENUM('tls','ssl','none') DEFAULT 'tls',
  
  -- WhatsApp config
  whatsapp_enabled    TINYINT(1) NOT NULL DEFAULT 0,
  whatsapp_api_url    VARCHAR(500) DEFAULT NULL,
  whatsapp_api_key    VARCHAR(500) DEFAULT NULL,
  whatsapp_from_number VARCHAR(20) DEFAULT NULL,
  
  -- Auto-notification triggers
  notify_on_sale          TINYINT(1) NOT NULL DEFAULT 1,
  notify_on_purchase      TINYINT(1) NOT NULL DEFAULT 0,
  notify_on_payment_due   TINYINT(1) NOT NULL DEFAULT 1,
  notify_on_credit_reminder TINYINT(1) NOT NULL DEFAULT 1,
  
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_settings (shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id     INT DEFAULT NULL,
  type        ENUM('sale_invoice','payment_due','credit_reminder','custom') NOT NULL,
  channel     ENUM('email','whatsapp','both') NOT NULL DEFAULT 'both',
  subject     VARCHAR(255) DEFAULT NULL,
  body        TEXT NOT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_type_channel (shop_id, type, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification log
CREATE TABLE IF NOT EXISTS notification_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id     INT NOT NULL,
  customer_id INT DEFAULT NULL,
  channel     ENUM('email','whatsapp') NOT NULL,
  type        VARCHAR(50) NOT NULL,
  recipient   VARCHAR(255) NOT NULL,
  subject     VARCHAR(255) DEFAULT NULL,
  body        TEXT DEFAULT NULL,
  status      ENUM('sent','failed','pending','queued') NOT NULL DEFAULT 'pending',
  error       TEXT DEFAULT NULL,
  reference_id VARCHAR(100) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default templates
INSERT IGNORE INTO notification_templates (shop_id, type, channel, subject, body) VALUES
(NULL, 'sale_invoice', 'email', 'Invoice from {{shop_name}} - {{receipt_number}}',
 'Dear {{customer_name}},\n\nThank you for your purchase at {{shop_name}}.\n\nInvoice: {{receipt_number}}\nDate: {{date}}\nTotal: ₹{{total_amount}}\nPayment: {{payment_method}}\n\nItems:\n{{items_list}}\n\nThank you for shopping with us!\n{{shop_name}}\n{{shop_phone}}'),

(NULL, 'sale_invoice', 'whatsapp',  NULL,
 '🧾 *Invoice from {{shop_name}}*\n\nReceipt: {{receipt_number}}\nDate: {{date}}\nTotal: *₹{{total_amount}}*\nPayment: {{payment_method}}\n\n{{items_list}}\n\nThank you! 🙏'),

(NULL, 'payment_due', 'email', 'Payment Reminder - {{shop_name}}',
 'Dear {{customer_name}},\n\nThis is a friendly reminder that you have an outstanding balance of ₹{{due_amount}} at {{shop_name}}.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\n{{shop_name}}\n{{shop_phone}}'),

(NULL, 'payment_due', 'whatsapp', NULL,
 '📢 *Payment Reminder*\n\nHi {{customer_name}},\n\nYou have a pending balance of *₹{{due_amount}}* at {{shop_name}}.\n\nKindly clear the dues. Thank you! 🙏'),

(NULL, 'credit_reminder', 'email', 'Credit Due Reminder - {{shop_name}}',
 'Dear {{customer_name}},\n\nThis is to remind you about your credit balance of ₹{{due_amount}} at {{shop_name}}.\n\nLast transaction: {{last_date}}\n\nPlease visit us to settle the amount.\n\nRegards,\n{{shop_name}}'),

(NULL, 'credit_reminder', 'whatsapp', NULL,
 '💳 *Credit Reminder*\n\nHi {{customer_name}},\n\nYour pending credit at *{{shop_name}}* is *₹{{due_amount}}*.\n\nLast transaction: {{last_date}}\n\nPlease settle at your convenience. Thanks! 🙏');
