const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('UserShop', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    shop_id: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'manager', 'staff'), defaultValue: 'staff' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'user_shops',
    timestamps: false,
  });
};
