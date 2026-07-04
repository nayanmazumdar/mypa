/**
 * Purchase Model Schema
 */
module.exports = {
  tableName: 'purchases',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    uuid: 'VARCHAR(36) NOT NULL UNIQUE',
    user_id: 'INT NOT NULL',
    supplier_id: 'INT',
    invoice_number: 'VARCHAR(50)',
    total_amount: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    discount: 'DECIMAL(10,2) DEFAULT 0',
    tax_amount: 'DECIMAL(10,2) DEFAULT 0',
    net_amount: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    payment_status: "ENUM('paid', 'unpaid', 'partial') DEFAULT 'unpaid'",
    payment_method: "ENUM('cash', 'card', 'upi', 'bank_transfer') DEFAULT 'cash'",
    status: "ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending'",
    notes: 'TEXT',
    purchase_date: 'DATE NOT NULL',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
  itemsTable: 'purchase_items',
  itemsSchema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    purchase_id: 'INT NOT NULL',
    product_id: 'INT NOT NULL',
    quantity: 'DECIMAL(10,2) NOT NULL',
    unit_price: 'DECIMAL(10,2) NOT NULL',
    total: 'DECIMAL(10,2) NOT NULL',
  },
};
