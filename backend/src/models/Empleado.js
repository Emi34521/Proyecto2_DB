const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Empleado = sequelize.define("Empleado", {
  id_empleado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  cargo:       { type: DataTypes.STRING(100) },
  email:       { type: DataTypes.STRING(150), unique: true },
  telefono:    { type: DataTypes.STRING(20) },
}, {
  tableName: "empleado",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Empleado;
