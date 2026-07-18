-- 026_features_admin_flag.sql
-- Add is_admin_only flag to features — these won't appear in the RBAC matrix

ALTER TABLE rbac_features ADD COLUMN is_admin_only TINYINT(1) NOT NULL DEFAULT 0;

-- Mark admin-panel features as admin-only
UPDATE rbac_features SET is_admin_only = 1 WHERE slug IN (
  'shop_settings', 'user_management', 'subscriptions', 'export_import', 'attendance'
);
