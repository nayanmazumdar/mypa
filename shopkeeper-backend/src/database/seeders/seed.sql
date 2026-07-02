-- Seed admin user (password: admin123)
INSERT INTO users (uuid, name, email, password, role, shop_name)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  'admin@shopkeeper.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'Admin Shop'
);

-- Seed demo shopkeeper (password: demo1234)
INSERT INTO users (uuid, name, email, password, role, shop_name)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Demo Shopkeeper',
  'demo@shopkeeper.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'shopkeeper',
  'Demo Store'
);
