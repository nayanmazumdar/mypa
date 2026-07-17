-- Migration 015: Add is_open status to shops
-- Controls whether a shop is open for business.
-- When closed, staff cannot select/access this shop.
-- Default FALSE — owner must explicitly open the shop after creation.
ALTER TABLE shops ADD COLUMN is_open BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active;
