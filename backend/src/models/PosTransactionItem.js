const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PosTransactionItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transaction_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    product_name: { type: DataTypes.STRING(200), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    unit: { type: DataTypes.STRING(20), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, {
    tableName: 'pos_transaction_items',
    timestamps: false,
  });
};
