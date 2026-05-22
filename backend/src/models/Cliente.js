const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cliente = sequelize.define("Cliente", {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  dpi:        { type: DataTypes.STRING(150), allowNull: false, unique: true },
  nombre:     { type: DataTypes.STRING(150), allowNull: false },
  email:      { type: DataTypes.STRING(150) },
  telefono:   { type: DataTypes.STRING(20) },
  direccion:  { type: DataTypes.TEXT },
}, {
  tableName: "cliente",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Cliente;