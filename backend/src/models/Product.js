const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.STRING(36), unique: true, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    category_id: { type: DataTypes.INTEGER },
    name: { type: DataTypes.STRING(200), allowNull: false },
    sku: { type: DataTypes.STRING(50), unique: true },
    barcode: { type: DataTypes.STRING(50) },
    description: { type: DataTypes.TEXT },
    brand: { type: DataTypes.STRING(100) },
    hsn_code: { type: DataTypes.STRING(20) },
    purchase_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    selling_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    mrp: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    unit: { type: DataTypes.STRING(20), defaultValue: 'piece' },
    weight: { type: DataTypes.STRING(50) },
    min_stock_level: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    max_stock_level: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    expiry_date: { type: DataTypes.DATEONLY },
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    image_url: { type: DataTypes.STRING(500) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'products',
    timestamps: true,
  });
};
