/**
 * Supplier Model Schema
 */
module.exports = {
  tableName: 'suppliers',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    uuid: 'VARCHAR(36) NOT NULL UNIQUE',
    user_id: 'INT NOT NULL',
    name: 'VARCHAR(100) NOT NULL',
    email: 'VARCHAR(150)',
    phone: 'VARCHAR(15)',
    company: 'VARCHAR(200)',
    address: 'TEXT',
    gst_number: 'VARCHAR(20)',
    balance: 'DECIMAL(10,2) DEFAULT 0',
    is_active: 'BOOLEAN DEFAULT TRUE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
};
