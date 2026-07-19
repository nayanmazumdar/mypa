-- 027_feature_categories.sql
-- Add category grouping to features for better organization in the UI

ALTER TABLE rbac_features ADD COLUMN category VARCHAR(50) DEFAULT 'General';

-- Categorize existing features
UPDATE rbac_features SET category = 'Sales & Billing' WHERE slug IN ('pos', 'sales', 'invoices', 'payments');
UPDATE rbac_features SET category = 'Inventory' WHERE slug IN ('products', 'categories', 'inventory', 'purchases', 'suppliers');
UPDATE rbac_features SET category = 'Customers' WHERE slug IN ('customers', 'customer_ledger');
UPDATE rbac_features SET category = 'Finance' WHERE slug IN ('expenses', 'reports');
UPDATE rbac_features SET category = 'Marketing' WHERE slug IN ('offers');
UPDATE rbac_features SET category = 'General' WHERE slug IN ('dashboard');
UPDATE rbac_features SET category = 'Admin' WHERE slug IN ('shop_settings', 'user_management', 'subscriptions', 'export_import', 'attendance');
