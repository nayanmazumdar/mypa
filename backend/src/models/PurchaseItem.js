const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PurchaseItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    purchase_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, {
    tableName: 'purchase_items',
    timestamps: false,
  });
};
