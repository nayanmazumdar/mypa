const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    reference_type: { type: DataTypes.ENUM('sale', 'purchase'), allowNull: false },
    reference_id: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer'), defaultValue: 'cash' },
    notes: { type: DataTypes.TEXT },
  }, {
    tableName: 'payments',
    timestamps: true,
    updatedAt: false,
  });
};
