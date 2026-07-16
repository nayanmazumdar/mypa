const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SubscriptionPlan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    display_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    price_monthly: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    price_quarterly: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    price_yearly: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
    max_products: { type: DataTypes.INTEGER, allowNull: true },
    max_staff: { type: DataTypes.INTEGER, allowNull: true },
    max_customers: { type: DataTypes.INTEGER, allowNull: true },
    max_monthly_sales: { type: DataTypes.INTEGER, allowNull: true },
    features: { type: DataTypes.JSON },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'subscription_plans',
    timestamps: true,
  });
};
