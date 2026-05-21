const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Producto = sequelize.define("Producto", {
  id_producto:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:          { type: DataTypes.STRING(150), allowNull: false },
  descripcion:     { type: DataTypes.TEXT },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock:           { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  categoria_id:    { type: DataTypes.INTEGER, allowNull: false },
  proveedor_id:    { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: "producto",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = Producto;
