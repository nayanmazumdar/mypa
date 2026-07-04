/**
 * Sale Model Schema
 */
module.exports = {
  tableName: 'sales',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    uuid: 'VARCHAR(36) NOT NULL UNIQUE',
    user_id: 'INT NOT NULL',
    customer_id: 'INT',
    invoice_number: 'VARCHAR(50) NOT NULL UNIQUE',
    total_amount: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    discount: 'DECIMAL(10,2) DEFAULT 0',
    tax_amount: 'DECIMAL(10,2) DEFAULT 0',
    net_amount: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    payment_status: "ENUM('paid', 'unpaid', 'partial') DEFAULT 'unpaid'",
    payment_method: "ENUM('cash', 'card', 'upi', 'bank_transfer') DEFAULT 'cash'",
    status: "ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending'",
    notes: 'TEXT',
    sale_date: 'DATE NOT NULL',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  // sale_items table
  itemsTable: 'sale_items',
  itemsSchema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    sale_id: 'INT NOT NULL',
    product_id: 'INT NOT NULL',
    quantity: 'DECIMAL(10,2) NOT NULL',
    unit_price: 'DECIMAL(10,2) NOT NULL',
    discount: 'DECIMAL(10,2) DEFAULT 0',
    total: 'DECIMAL(10,2) NOT NULL',
  },
};
