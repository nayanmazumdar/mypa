const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Shop', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.STRING(36), unique: true, allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    address: { type: DataTypes.TEXT },
    phone: { type: DataTypes.STRING(15) },
    email: { type: DataTypes.STRING(150) },
    gst_number: { type: DataTypes.STRING(20) },
    logo_url: { type: DataTypes.STRING(500) },
    owner_id: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'shops',
    timestamps: true,
  });
};
