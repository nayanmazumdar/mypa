const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('CustomerLedger', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM('credit', 'payment'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.STRING(30) },
    reference: { type: DataTypes.STRING(100) },
    notes: { type: DataTypes.TEXT },
  }, {
    tableName: 'customer_ledger',
    timestamps: true,
    updatedAt: false,
  });
};
