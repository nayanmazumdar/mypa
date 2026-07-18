-- 029_sms_config.sql
-- Add SMS (text message) configuration to notification settings

ALTER TABLE notification_settings ADD COLUMN sms_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE notification_settings ADD COLUMN sms_api_url VARCHAR(500) DEFAULT NULL;
ALTER TABLE notification_settings ADD COLUMN sms_api_key VARCHAR(500) DEFAULT NULL;
ALTER TABLE notification_settings ADD COLUMN sms_sender_id VARCHAR(20) DEFAULT NULL;
ALTER TABLE notification_settings ADD COLUMN sms_provider ENUM('twilio','msg91','textlocal','generic') DEFAULT 'generic';

-- Update templates & logs to support sms channel
ALTER TABLE notification_templates MODIFY COLUMN channel ENUM('email','whatsapp','sms','both') NOT NULL DEFAULT 'both';
ALTER TABLE notification_logs MODIFY COLUMN channel ENUM('email','whatsapp','sms') NOT NULL;

-- Seed SMS templates
INSERT IGNORE INTO notification_templates (shop_id, type, channel, subject, body) VALUES
(NULL, 'sale_invoice', 'sms', NULL,
 'Thank you for shopping at {{shop_name}}! Invoice: {{receipt_number}}, Total: Rs.{{total_amount}}. {{shop_phone}}'),
(NULL, 'payment_due', 'sms', NULL,
 'Reminder: You have a pending balance of Rs.{{due_amount}} at {{shop_name}}. Please pay at your convenience. {{shop_phone}}'),
(NULL, 'credit_reminder', 'sms', NULL,
 'Hi {{customer_name}}, your credit balance at {{shop_name}} is Rs.{{due_amount}}. Last txn: {{last_date}}. Kindly settle. {{shop_phone}}');
