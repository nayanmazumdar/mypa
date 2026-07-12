const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PosTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.STRING(36), unique: true, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    customer_name: { type: DataTypes.STRING(100) },
    customer_id: { type: DataTypes.INTEGER },
    total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    net_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    payment_method: { type: DataTypes.STRING(20), defaultValue: 'cash' },
    amount_received: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    change_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('completed', 'cancelled'), defaultValue: 'completed' },
    receipt_number: { type: DataTypes.STRING(50), allowNull: false },
  }, {
    tableName: 'pos_transactions',
    timestamps: true,
    updatedAt: false,
  });
};
