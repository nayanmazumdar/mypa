-- Migration 023: Add unique index on inventory (product_id, shop_id)
-- The POS and inventory code queries/updates by (product_id, shop_id),
-- but the original unique key was on (product_id, user_id).
-- This adds the proper constraint for multi-tenant shops.

-- Drop old unique key if it exists (safe — skipped if not present)
ALTER TABLE inventory DROP INDEX unique_product_user;

-- Add the correct unique key for shop-scoped inventory
ALTER TABLE inventory ADD UNIQUE KEY unique_product_shop (product_id, shop_id);
