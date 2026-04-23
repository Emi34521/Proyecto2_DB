const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

// ── 1. Ventas por día — GROUP BY + HAVING + funciones de agregación ───────────
router.get("/ventas-por-dia", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DATE(v.fecha)      AS dia,
             COUNT(v.id_venta)  AS total_ventas,
             SUM(v.total)       AS ingresos,
             AVG(v.total)       AS ticket_promedio
      FROM   venta v
      GROUP  BY DATE(v.fecha)
      HAVING COUNT(v.id_venta) >= 1
      ORDER  BY dia DESC
      LIMIT  30
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 2. Productos más vendidos — JOIN múltiples tablas ─────────────────────────
router.get("/productos-mas-vendidos", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id_producto,
             p.nombre                                        AS producto,
             cat.nombre                                      AS categoria,
             SUM(dv.cantidad)                                AS unidades_vendidas,
             SUM(dv.cantidad * dv.precio_unitario)           AS ingresos_totales
      FROM   detalle_ventas dv
      JOIN   producto       p   ON dv.producto_id  = p.id_producto
      JOIN   categoria      cat ON p.categoria_id  = cat.id_categoria
      GROUP  BY p.id_producto, p.nombre, cat.nombre
      ORDER  BY unidades_vendidas DESC
      LIMIT  10
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 3. Stock bajo — usa VIEW v_stock_bajo ─────────────────────────────────────
router.get("/stock-bajo", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM v_stock_bajo ORDER BY stock ASC`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 4. Ventas por empleado — usa VIEW v_resumen_ventas_empleado ───────────────
router.get("/ventas-por-empleado", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM v_resumen_ventas_empleado ORDER BY monto_total DESC`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 5. Clientes que nunca compraron — SUBQUERY con NOT IN ─────────────────────
router.get("/clientes-sin-compra", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id_cliente, nombre, email, telefono, created_at
      FROM   cliente
      WHERE  id_cliente NOT IN (
               SELECT DISTINCT cliente_id FROM venta
             )
      ORDER  BY nombre
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 6. Productos nunca vendidos — SUBQUERY con NOT EXISTS ─────────────────────
router.get("/productos-sin-venta", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id_producto, p.nombre, p.stock, p.precio_unitario, cat.nombre AS categoria
      FROM   producto p
      JOIN   categoria cat ON p.categoria_id = cat.id_categoria
      WHERE  NOT EXISTS (
               SELECT 1 FROM detalle_ventas dv WHERE dv.producto_id = p.id_producto
             )
      ORDER  BY p.nombre
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 7. Ranking de categorías con CTE ─────────────────────────────────────────
router.get("/ranking-categorias", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      WITH ventas_por_categoria AS (
        SELECT cat.id_categoria,
               cat.nombre                              AS categoria,
               COUNT(DISTINCT dv.venta_id)             AS num_ventas,
               SUM(dv.cantidad * dv.precio_unitario)   AS ingresos
        FROM   detalle_ventas dv
        JOIN   producto       p   ON dv.producto_id = p.id_producto
        JOIN   categoria      cat ON p.categoria_id = cat.id_categoria
        GROUP  BY cat.id_categoria, cat.nombre
      )
      SELECT categoria, num_ventas, ingresos,
             RANK() OVER (ORDER BY ingresos DESC) AS ranking
      FROM   ventas_por_categoria
      ORDER  BY ranking
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 8. Margen de ganancia por producto (compra vs venta) — subquery en FROM ───
router.get("/margen-productos", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id_producto,
             p.nombre,
             p.precio_unitario                               AS precio_venta,
             ultimas_compras.costo_unitario,
             ROUND(p.precio_unitario - ultimas_compras.costo_unitario, 2)
               AS margen_bruto,
             ROUND(
               (p.precio_unitario - ultimas_compras.costo_unitario)
               / NULLIF(ultimas_compras.costo_unitario, 0) * 100
             , 2) AS margen_pct
      FROM   producto p
      JOIN   (
               SELECT id_producto,
                      precio_mayor_unidad AS costo_unitario
               FROM   compra c1
               WHERE  fecha = (
                        SELECT MAX(fecha) FROM compra c2
                        WHERE c2.id_producto = c1.id_producto
                      )
             ) AS ultimas_compras ON ultimas_compras.id_producto = p.id_producto
      ORDER  BY margen_pct DESC NULLS LAST
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 9. Resumen general (dashboard) ───────────────────────────────────────────
router.get("/resumen", authMiddleware, async (req, res) => {
  try {
    const [ventas, productos, clientes, stockBajo] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS monto FROM venta`),
      pool.query(`SELECT COUNT(*) AS total FROM producto`),
      pool.query(`SELECT COUNT(*) AS total FROM cliente`),
      pool.query(`SELECT COUNT(*) AS total FROM v_stock_bajo`),
    ]);
    res.json({
      ventas:     { total: ventas.rows[0].total,     monto: ventas.rows[0].monto },
      productos:  { total: productos.rows[0].total },
      clientes:   { total: clientes.rows[0].total },
      stock_bajo: { total: stockBajo.rows[0].total },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 10. Exportar ventas a CSV ─────────────────────────────────────────────────
router.get("/exportar-ventas-csv", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT v.id_venta, v.fecha, v.total,
             c.nombre AS cliente, c.DPI,
             e.nombre AS empleado
      FROM   venta    v
      JOIN   cliente  c ON v.cliente_id  = c.id_cliente
      JOIN   empleado e ON v.empleado_id = e.id_empleado
      ORDER  BY v.fecha DESC
    `);

    const cols = ["id_venta", "fecha", "total", "cliente", "DPI", "empleado"];
    const csv = [
      cols.join(","),
      ...r.rows.map(row =>
        cols.map(col => `"${String(row[col] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ventas_${Date.now()}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 11. Exportar productos a CSV ──────────────────────────────────────────────
router.get("/exportar-productos-csv", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id_producto, p.nombre, p.descripcion,
             p.precio_unitario, p.stock,
             c.nombre AS categoria, pr.nombre AS proveedor
      FROM   producto  p
      JOIN   categoria c  ON p.categoria_id = c.id_categoria
      JOIN   proveedor pr ON p.proveedor_id = pr.id_proveedor
      ORDER  BY p.nombre
    `);
    const cols = ["id_producto","nombre","descripcion","precio_unitario","stock","categoria","proveedor"];
    const csv = [
      cols.join(","),
      ...r.rows.map(row =>
        cols.map(col => `"${String(row[col] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="productos_${Date.now()}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
