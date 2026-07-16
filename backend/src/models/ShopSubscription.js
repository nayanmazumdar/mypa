const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ShopSubscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shop_id: { type: DataTypes.INTEGER, allowNull: false },
    plan_id: { type: DataTypes.INTEGER, allowNull: false },
    billing_cycle: { type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'), defaultValue: 'monthly' },
    status: { type: DataTypes.ENUM('active', 'expired', 'cancelled', 'trial'), defaultValue: 'trial' },
    amount_paid: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    payment_reference: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'shop_subscriptions',
    timestamps: true,
  });
};
