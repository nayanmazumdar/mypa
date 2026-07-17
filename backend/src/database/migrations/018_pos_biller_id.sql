-- Migration 018: Add biller_id to pos_transactions
-- Tracks which staff member / user actually processed each POS transaction.
-- Useful for referrals, performance tracking, and audit trails.
ALTER TABLE pos_transactions
  ADD COLUMN biller_id INT DEFAULT NULL AFTER user_id,
  ADD CONSTRAINT fk_pos_biller FOREIGN KEY (biller_id) REFERENCES users(id) ON DELETE SET NULL;
