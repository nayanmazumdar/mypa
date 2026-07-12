const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Inventory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    min_stock_level: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    max_stock_level: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    location: { type: DataTypes.STRING(100) },
  }, {
    tableName: 'inventory',
    timestamps: false,
    updatedAt: 'updated_at',
  });
};
