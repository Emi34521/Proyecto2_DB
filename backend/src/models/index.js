// src/models/index.js
const sequelize = require("../config/database");

const Categoria   = require("./Categoria");
const Proveedor   = require("./Proveedor");
const Producto    = require("./Producto");
const Cliente     = require("./Cliente");
const Empleado    = require("./Empleado");
const Venta       = require("./Venta");
const DetalleVenta = require("./DetalleVenta");
const Compra      = require("./Compra");
const Usuario     = require("./Usuario");

// ── Asociaciones ──────────────────────────────────────────────

// Producto → Categoria (N:1)
Producto.belongsTo(Categoria, { foreignKey: "categoria_id", as: "categoria" });
Categoria.hasMany(Producto,   { foreignKey: "categoria_id", as: "productos" });

// Producto → Proveedor (N:1)
Producto.belongsTo(Proveedor, { foreignKey: "proveedor_id", as: "proveedor" });
Proveedor.hasMany(Producto,   { foreignKey: "proveedor_id", as: "productos" });

// Venta → Cliente (N:1)
Venta.belongsTo(Cliente, { foreignKey: "cliente_id", as: "cliente" });
Cliente.hasMany(Venta,   { foreignKey: "cliente_id", as: "ventas" });

// Venta → Empleado (N:1)
Venta.belongsTo(Empleado, { foreignKey: "empleado_id", as: "empleado" });
Empleado.hasMany(Venta,   { foreignKey: "empleado_id", as: "ventas" });

// DetalleVenta → Venta (N:1)
DetalleVenta.belongsTo(Venta,    { foreignKey: "venta_id",    as: "venta" });
Venta.hasMany(DetalleVenta,      { foreignKey: "venta_id",    as: "detalle" });

// DetalleVenta → Producto (N:1)
DetalleVenta.belongsTo(Producto, { foreignKey: "producto_id", as: "producto" });
Producto.hasMany(DetalleVenta,   { foreignKey: "producto_id", as: "detalles" });

// Compra → Proveedor (N:1)
Compra.belongsTo(Proveedor, { foreignKey: "id_proveedor", as: "proveedor" });
Proveedor.hasMany(Compra,   { foreignKey: "id_proveedor", as: "compras" });

// Compra → Producto (N:1)
Compra.belongsTo(Producto,  { foreignKey: "id_producto",  as: "producto" });
Producto.hasMany(Compra,    { foreignKey: "id_producto",  as: "compras" });

module.exports = {
  sequelize,
  Categoria,
  Proveedor,
  Producto,
  Cliente,
  Empleado,
  Venta,
  DetalleVenta,
  Compra,
  Usuario,
};
