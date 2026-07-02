/**
 * Product Model Schema
 */
module.exports = {
  tableName: 'products',
  schema: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    uuid: 'VARCHAR(36) NOT NULL UNIQUE',
    user_id: 'INT NOT NULL',
    category_id: 'INT',
    name: 'VARCHAR(200) NOT NULL',
    sku: 'VARCHAR(50) UNIQUE',
    barcode: 'VARCHAR(50)',
    description: 'TEXT',
    purchase_price: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    selling_price: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
    unit: "VARCHAR(20) DEFAULT 'piece'",
    tax_rate: 'DECIMAL(5,2) DEFAULT 0',
    image_url: 'VARCHAR(500)',
    is_active: 'BOOLEAN DEFAULT TRUE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
};
