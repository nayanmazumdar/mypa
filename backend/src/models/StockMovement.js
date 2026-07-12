const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('StockMovement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    type: { type: DataTypes.ENUM('in', 'out', 'adjustment'), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    reference_type: { type: DataTypes.STRING(50) },
    reference_id: { type: DataTypes.INTEGER },
    notes: { type: DataTypes.TEXT },
  }, {
    tableName: 'stock_movements',
    timestamps: true,
    updatedAt: false,
  });
};
