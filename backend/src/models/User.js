/**
 * User Model Schema
 * Used for MySQL table creation and validation reference
 */
module.exports = {
  tableName: 'users',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    uuid: 'VARCHAR(36) NOT NULL UNIQUE',
    name: 'VARCHAR(100) NOT NULL',
    email: 'VARCHAR(150) NOT NULL UNIQUE',
    phone: 'VARCHAR(15)',
    password: 'VARCHAR(255) NOT NULL',
    role: "ENUM('admin', 'shopkeeper', 'staff') DEFAULT 'shopkeeper'",
    shop_name: 'VARCHAR(200)',
    address: 'TEXT',
    is_active: 'BOOLEAN DEFAULT TRUE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
};
