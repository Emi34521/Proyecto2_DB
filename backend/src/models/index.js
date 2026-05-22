// src/models/index.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ── Definir modelos directamente aquí para evitar imports circulares ──

const Categoria = sequelize.define("Categoria", {
  id_categoria: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:       { type: DataTypes.STRING(100), allowNull: false, unique: true },
  descripcion:  { type: DataTypes.TEXT },
}, { tableName: "categoria", timestamps: false });

const Proveedor = sequelize.define("Proveedor", {
  id_proveedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:       { type: DataTypes.STRING(150), allowNull: false },
  contacto:     { type: DataTypes.STRING(150) },
  telefono:     { type: DataTypes.STRING(20) },
  email:        { type: DataTypes.STRING(150) },
  ubicacion:    { type: DataTypes.STRING(150) },
}, { tableName: "proveedor", timestamps: false });

const Producto = sequelize.define("Producto", {
  id_producto:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:          { type: DataTypes.STRING(150), allowNull: false },
  descripcion:     { type: DataTypes.TEXT },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock:           { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  categoria_id:    { type: DataTypes.INTEGER, allowNull: false },
  proveedor_id:    { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "producto", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });

const Cliente = sequelize.define("Cliente", {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  dpi:        { type: DataTypes.STRING(150), allowNull: false, unique: true, field: "dpi" },
  nombre:     { type: DataTypes.STRING(150), allowNull: false },
  email:      { type: DataTypes.STRING(150) },
  telefono:   { type: DataTypes.STRING(20) },
  direccion:  { type: DataTypes.TEXT },
}, { tableName: "cliente", timestamps: true, createdAt: "created_at", updatedAt: false });

const Empleado = sequelize.define("Empleado", {
  id_empleado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  cargo:       { type: DataTypes.STRING(100) },
  email:       { type: DataTypes.STRING(150), unique: true },
  telefono:    { type: DataTypes.STRING(20) },
}, { tableName: "empleado", timestamps: true, createdAt: "created_at", updatedAt: false });

const Venta = sequelize.define("Venta", {
  id_venta:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cliente_id:  { type: DataTypes.INTEGER, allowNull: false },
  empleado_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cancelada:   { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "venta", timestamps: false });

const DetalleVenta = sequelize.define("DetalleVenta", {
  id_detalle:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  venta_id:        { type: DataTypes.INTEGER, allowNull: false },
  producto_id:     { type: DataTypes.INTEGER, allowNull: false },
  cantidad:        { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: "detalle_ventas", timestamps: false });

const Compra = sequelize.define("Compra", {
  id_compra:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_proveedor:        { type: DataTypes.INTEGER, allowNull: false },
  id_producto:         { type: DataTypes.INTEGER, allowNull: false },
  cantidad_compra:     { type: DataTypes.INTEGER, allowNull: false },
  precio_mayor_unidad: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  fecha:               { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: "compra", timestamps: false });

const Usuario = sequelize.define("Usuario", {
  id_usuario:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:          { type: DataTypes.STRING(150), allowNull: false },
  correo:          { type: DataTypes.STRING(200), allowNull: false, unique: true },
  telefono:        { type: DataTypes.STRING(20) },
  contrasena_hash: { type: DataTypes.STRING(255), allowNull: false },
  tipo_usuario:    { type: DataTypes.STRING(20), allowNull: false },
}, { tableName: "usuario", timestamps: false });

// ── Asociaciones ──────────────────────────────────────────────
Producto.belongsTo(Categoria,  { foreignKey: "categoria_id", as: "categoria" });
Categoria.hasMany(Producto,    { foreignKey: "categoria_id", as: "productos" });

Producto.belongsTo(Proveedor,  { foreignKey: "proveedor_id", as: "proveedor" });
Proveedor.hasMany(Producto,    { foreignKey: "proveedor_id", as: "productos" });

Venta.belongsTo(Cliente,       { foreignKey: "cliente_id",  as: "cliente" });
Cliente.hasMany(Venta,         { foreignKey: "cliente_id",  as: "ventas" });

Venta.belongsTo(Empleado,      { foreignKey: "empleado_id", as: "empleado" });
Empleado.hasMany(Venta,        { foreignKey: "empleado_id", as: "ventas" });

DetalleVenta.belongsTo(Venta,    { foreignKey: "venta_id",    as: "venta" });
Venta.hasMany(DetalleVenta,      { foreignKey: "venta_id",    as: "detalle" });

DetalleVenta.belongsTo(Producto, { foreignKey: "producto_id", as: "producto" });
Producto.hasMany(DetalleVenta,   { foreignKey: "producto_id", as: "detalles" });

Compra.belongsTo(Proveedor,    { foreignKey: "id_proveedor", as: "proveedor" });
Proveedor.hasMany(Compra,      { foreignKey: "id_proveedor", as: "compras" });

Compra.belongsTo(Producto,     { foreignKey: "id_producto",  as: "producto" });
Producto.hasMany(Compra,       { foreignKey: "id_producto",  as: "compras" });

module.exports = {
  sequelize,
  Categoria, Proveedor, Producto, Cliente,
  Empleado, Venta, DetalleVenta, Compra, Usuario,
};