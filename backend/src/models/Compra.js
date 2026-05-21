const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Compra = sequelize.define("Compra", {
  id_compra:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_proveedor:        { type: DataTypes.INTEGER, allowNull: false },
  id_producto:         { type: DataTypes.INTEGER, allowNull: false },
  cantidad_compra:     { type: DataTypes.INTEGER, allowNull: false },
  precio_mayor_unidad: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fecha:               { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "compra",
  timestamps: false,
});

module.exports = Compra;
