const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Purchase', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.STRING(36), unique: true, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER },
    supplier_id: { type: DataTypes.INTEGER },
    invoice_number: { type: DataTypes.STRING(50) },
    total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    net_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    payment_status: { type: DataTypes.ENUM('paid', 'unpaid', 'partial'), defaultValue: 'unpaid' },
    payment_method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer'), defaultValue: 'cash' },
    status: { type: DataTypes.ENUM('pending', 'completed', 'cancelled'), defaultValue: 'pending' },
    notes: { type: DataTypes.TEXT },
    purchase_date: { type: DataTypes.DATEONLY, allowNull: false },
  }, {
    tableName: 'purchases',
    timestamps: true,
  });
};
