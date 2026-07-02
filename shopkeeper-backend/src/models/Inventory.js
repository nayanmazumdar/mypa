/**
 * Inventory Model Schema
 */
module.exports = {
  tableName: 'inventory',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    product_id: 'INT NOT NULL',
    user_id: 'INT NOT NULL',
    quantity: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    min_stock_level: 'DECIMAL(10,2) DEFAULT 0',
    max_stock_level: 'DECIMAL(10,2) DEFAULT 0',
    location: 'VARCHAR(100)',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  // Stock movement log
  movementTable: 'stock_movements',
  movementSchema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    product_id: 'INT NOT NULL',
    user_id: 'INT NOT NULL',
    type: "ENUM('in', 'out', 'adjustment') NOT NULL",
    quantity: 'DECIMAL(10,2) NOT NULL',
    reference_type: 'VARCHAR(50)',
    reference_id: 'INT',
    notes: 'TEXT',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  },
};
