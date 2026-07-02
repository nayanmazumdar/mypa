/**
 * Customer Model Schema
 */
module.exports = {
  tableName: 'customers',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    uuid: 'VARCHAR(36) NOT NULL UNIQUE',
    user_id: 'INT NOT NULL',
    name: 'VARCHAR(100) NOT NULL',
    email: 'VARCHAR(150)',
    phone: 'VARCHAR(15)',
    address: 'TEXT',
    balance: 'DECIMAL(10,2) DEFAULT 0',
    notes: 'TEXT',
    is_active: 'BOOLEAN DEFAULT TRUE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
};
