const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Proveedor = sequelize.define("Proveedor", {
  id_proveedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:       { type: DataTypes.STRING(150), allowNull: false },
  contacto:     { type: DataTypes.STRING(150) },
  telefono:     { type: DataTypes.STRING(20) },
  email:        { type: DataTypes.STRING(150) },
  ubicacion:    { type: DataTypes.STRING(150) },
}, {
  tableName: "proveedor",
  timestamps: false,
});

module.exports = Proveedor;
