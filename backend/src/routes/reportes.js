// routes/reportes.js
const express   = require("express");
const router    = express.Router();
const sequelize = require("../config/database");
const { QueryTypes } = require("sequelize");
const { authMiddleware, requireRole } = require("../middleware/auth");

const TODOS = ["admin", "vendedor", "bodeguero", "supervisor", "consulta"];

// 1. Ventas por día
router.get("/ventas-por-dia", authMiddleware, requireRole(...TODOS), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT DATE(v.fecha) AS dia, COUNT(v.id_venta) AS total_ventas,
             SUM(v.total) AS ingresos, AVG(v.total) AS ticket_promedio
      FROM venta v WHERE v.cancelada = FALSE
      GROUP BY DATE(v.fecha) HAVING COUNT(v.id_venta) >= 1
      ORDER BY dia DESC LIMIT 30
    `, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Productos más vendidos
router.get("/productos-mas-vendidos", authMiddleware, requireRole(...TODOS), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT p.id_producto, p.nombre AS producto, cat.nombre AS categoria,
             SUM(dv.cantidad) AS unidades_vendidas,
             SUM(dv.cantidad * dv.precio_unitario) AS ingresos_totales
      FROM detalle_ventas dv
      JOIN venta v ON dv.venta_id = v.id_venta AND v.cancelada = FALSE
      JOIN producto p ON dv.producto_id = p.id_producto
      JOIN categoria cat ON p.categoria_id = cat.id_categoria
      GROUP BY p.id_producto, p.nombre, cat.nombre
      ORDER BY unidades_vendidas DESC LIMIT 10
    `, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Stock bajo (VIEW)
router.get("/stock-bajo", authMiddleware, requireRole(...TODOS), async (req, res) => {
  try {
    const r = await sequelize.query(`SELECT * FROM v_stock_bajo ORDER BY stock ASC`, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Ventas por empleado (VIEW)
router.get("/ventas-por-empleado", authMiddleware, requireRole(...TODOS), async (req, res) => {
  try {
    const r = await sequelize.query(`SELECT * FROM v_resumen_ventas_empleado ORDER BY monto_total DESC`, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Clientes sin compra
router.get("/clientes-sin-compra", authMiddleware, requireRole("admin", "supervisor", "vendedor"), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT id_cliente, nombre, email, telefono, created_at FROM cliente
      WHERE id_cliente NOT IN (SELECT DISTINCT cliente_id FROM venta)
      ORDER BY nombre
    `, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Productos sin venta
router.get("/productos-sin-venta", authMiddleware, requireRole("admin", "supervisor", "bodeguero"), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT p.id_producto, p.nombre, p.stock, p.precio_unitario, cat.nombre AS categoria
      FROM producto p JOIN categoria cat ON p.categoria_id = cat.id_categoria
      WHERE NOT EXISTS (SELECT 1 FROM detalle_ventas dv WHERE dv.producto_id = p.id_producto)
      ORDER BY p.nombre
    `, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Ranking categorías con CTE
router.get("/ranking-categorias", authMiddleware, requireRole(...TODOS), async (req, res) => {
  try {
    const r = await sequelize.query(`
      WITH ventas_por_categoria AS (
        SELECT cat.id_categoria, cat.nombre AS categoria,
               COUNT(DISTINCT dv.venta_id) AS num_ventas,
               SUM(dv.cantidad * dv.precio_unitario) AS ingresos
        FROM detalle_ventas dv
        JOIN venta v ON dv.venta_id = v.id_venta AND v.cancelada = FALSE
        JOIN producto p ON dv.producto_id = p.id_producto
        JOIN categoria cat ON p.categoria_id = cat.id_categoria
        GROUP BY cat.id_categoria, cat.nombre
      )
      SELECT categoria, num_ventas, ingresos,
             RANK() OVER (ORDER BY ingresos DESC) AS ranking
      FROM ventas_por_categoria ORDER BY ranking
    `, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. Margen de ganancia
router.get("/margen-productos", authMiddleware, requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT p.id_producto, p.nombre, p.precio_unitario AS precio_venta,
             ultimas_compras.costo_unitario,
             ROUND(p.precio_unitario - ultimas_compras.costo_unitario, 2) AS margen_bruto,
             ROUND((p.precio_unitario - ultimas_compras.costo_unitario)
               / NULLIF(ultimas_compras.costo_unitario, 0) * 100, 2) AS margen_pct
      FROM producto p
      JOIN (
        SELECT id_producto, precio_mayor_unidad AS costo_unitario FROM compra c1
        WHERE fecha = (SELECT MAX(fecha) FROM compra c2 WHERE c2.id_producto = c1.id_producto)
      ) AS ultimas_compras ON ultimas_compras.id_producto = p.id_producto
      ORDER BY margen_pct DESC NULLS LAST
    `, { type: QueryTypes.SELECT });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. Resumen (dashboard)
router.get("/resumen", authMiddleware, requireRole(...TODOS), async (req, res) => {
  try {
    const [ventas, productos, clientes, stockBajo] = await Promise.all([
      sequelize.query(`SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS monto FROM venta WHERE cancelada=FALSE`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) AS total FROM producto`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) AS total FROM cliente`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT COUNT(*) AS total FROM v_stock_bajo`, { type: QueryTypes.SELECT }),
    ]);
    res.json({
      ventas:     { total: ventas[0].total,     monto: ventas[0].monto },
      productos:  { total: productos[0].total },
      clientes:   { total: clientes[0].total },
      stock_bajo: { total: stockBajo[0].total },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 10. Exportar ventas CSV
router.get("/exportar-ventas-csv", authMiddleware, requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT v.id_venta, v.fecha, v.total, c.nombre AS cliente, c.DPI, e.nombre AS empleado
      FROM venta v JOIN cliente c ON v.cliente_id=c.id_cliente JOIN empleado e ON v.empleado_id=e.id_empleado
      WHERE v.cancelada=FALSE ORDER BY v.fecha DESC
    `, { type: QueryTypes.SELECT });
    const cols = ["id_venta","fecha","total","cliente","DPI","empleado"];
    const csv = [cols.join(","), ...r.map(row => cols.map(col => `"${String(row[col]??'').replace(/"/g,'""')}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ventas_${Date.now()}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 11. Exportar productos CSV
router.get("/exportar-productos-csv", authMiddleware, requireRole("admin", "supervisor", "bodeguero"), async (req, res) => {
  try {
    const r = await sequelize.query(`
      SELECT p.id_producto,p.nombre,p.descripcion,p.precio_unitario,p.stock,c.nombre AS categoria,pr.nombre AS proveedor
      FROM producto p JOIN categoria c ON p.categoria_id=c.id_categoria JOIN proveedor pr ON p.proveedor_id=pr.id_proveedor
      ORDER BY p.nombre
    `, { type: QueryTypes.SELECT });
    const cols = ["id_producto","nombre","descripcion","precio_unitario","stock","categoria","proveedor"];
    const csv = [cols.join(","), ...r.map(row => cols.map(col => `"${String(row[col]??'').replace(/"/g,'""')}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="productos_${Date.now()}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
