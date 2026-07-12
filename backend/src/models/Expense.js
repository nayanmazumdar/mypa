const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Expense', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    category: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer'), defaultValue: 'cash' },
    expense_date: { type: DataTypes.DATEONLY, allowNull: false },
  }, {
    tableName: 'expenses',
    timestamps: true,
    updatedAt: false,
  });
};
