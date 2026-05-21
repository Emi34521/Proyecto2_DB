const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Venta = sequelize.define("Venta", {
  id_venta:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cliente_id:  { type: DataTypes.INTEGER, allowNull: false },
  empleado_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cancelada:   { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: "venta",
  timestamps: false,
});

module.exports = Venta;
