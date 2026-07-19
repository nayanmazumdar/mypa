-- 025_rbac_remove_shop_scope.sql
-- Simplify RBAC: roles are global, not per-shop.
-- Role ↔ Features ↔ Users — no shop scoping.

-- Remove shop_id from rbac_roles
ALTER TABLE rbac_roles DROP INDEX uq_role_slug_shop;
ALTER TABLE rbac_roles DROP COLUMN shop_id;
ALTER TABLE rbac_roles ADD UNIQUE KEY uq_role_slug (slug);

-- Remove shop_id from rbac_user_roles
ALTER TABLE rbac_user_roles DROP INDEX uq_user_role_shop;
ALTER TABLE rbac_user_roles DROP COLUMN shop_id;
ALTER TABLE rbac_user_roles ADD UNIQUE KEY uq_user_role (user_id, role_id);

-- Remove shop_id from rbac_features (features are always global)
ALTER TABLE rbac_features DROP COLUMN shop_id;
