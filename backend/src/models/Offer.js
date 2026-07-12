const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Offer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shop_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    discount_type: { type: DataTypes.ENUM('percentage', 'flat'), defaultValue: 'percentage' },
    discount_value: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    min_purchase_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    max_discount_amount: { type: DataTypes.DECIMAL(10, 2) },
    applicable_to: { type: DataTypes.ENUM('all', 'category', 'product'), defaultValue: 'all' },
    category_id: { type: DataTypes.INTEGER },
    product_id: { type: DataTypes.INTEGER },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'offers',
    timestamps: true,
  });
};
