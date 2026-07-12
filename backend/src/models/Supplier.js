const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Supplier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.STRING(36), unique: true, allowNull: false },
    user_id: { type: DataTypes.INTEGER },
    shop_id: { type: DataTypes.INTEGER },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150) },
    phone: { type: DataTypes.STRING(15) },
    company: { type: DataTypes.STRING(200) },
    address: { type: DataTypes.TEXT },
    gst_number: { type: DataTypes.STRING(20) },
    balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'suppliers',
    timestamps: true,
  });
};
