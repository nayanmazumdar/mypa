const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.STRING(36), unique: true, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), unique: true, allowNull: false },
    phone: { type: DataTypes.STRING(15) },
    password: { type: DataTypes.STRING(255), allowNull: false },
    passcode: { type: DataTypes.STRING(255) },
    role: { type: DataTypes.ENUM('admin', 'shopkeeper', 'staff'), defaultValue: 'shopkeeper' },
    shop_id: { type: DataTypes.INTEGER },
    shop_name: { type: DataTypes.STRING(200) },
    address: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  return User;
};
