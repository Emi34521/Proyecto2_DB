const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

// GET /api/ventas  — JOIN venta + cliente + empleado
router.get("/", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT v.id_venta, v.fecha, v.total,
             c.nombre AS cliente, c.DPI,
             e.nombre AS empleado, e.cargo
      FROM   venta    v
      JOIN   cliente  c ON v.cliente_id  = c.id_cliente
      JOIN   empleado e ON v.empleado_id = e.id_empleado
      ORDER  BY v.fecha DESC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ventas/:id — detalle usando VIEW v_ventas_detalle
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const cabecera = await pool.query(
      `SELECT v.*, c.nombre AS cliente, c.DPI, e.nombre AS empleado
       FROM venta v
       JOIN cliente  c ON v.cliente_id  = c.id_cliente
       JOIN empleado e ON v.empleado_id = e.id_empleado
       WHERE v.id_venta = $1`,
      [req.params.id]
    );
    if (cabecera.rowCount === 0) return res.status(404).json({ error: "No encontrada" });

    // Usa la VIEW para el detalle de líneas
    const detalle = await pool.query(
      `SELECT producto, cantidad, precio_unitario, subtotal
       FROM   v_ventas_detalle
       WHERE  id_venta = $1`,
      [req.params.id]
    );
    res.json({ ...cabecera.rows[0], detalle: detalle.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ventas  — TRANSACCIÓN EXPLÍCITA con ROLLBACK en error
router.post("/", authMiddleware, async (req, res) => {
  const { cliente_id, empleado_id, items } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: "La venta debe incluir al menos un producto" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let total = 0;

    // Verificar stock y calcular total — FOR UPDATE evita condición de carrera
    for (const item of items) {
      const prod = await client.query(
        `SELECT precio_unitario, stock FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [item.producto_id]
      );
      if (prod.rowCount === 0)
        throw new Error(`Producto ${item.producto_id} no existe`);
      if (prod.rows[0].stock < item.cantidad)
        throw new Error(`Stock insuficiente para producto ID ${item.producto_id}`);

      total += parseFloat(prod.rows[0].precio_unitario) * item.cantidad;
    }

    // Insertar cabecera
    const ventaRes = await client.query(
      `INSERT INTO venta (cliente_id, empleado_id, total) VALUES ($1,$2,$3) RETURNING *`,
      [cliente_id, empleado_id, total.toFixed(2)]
    );
    const venta_id = ventaRes.rows[0].id_venta;

    // Insertar detalle y descontar stock
    for (const item of items) {
      const prod = await client.query(
        `SELECT precio_unitario FROM producto WHERE id_producto = $1`,
        [item.producto_id]
      );
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
         VALUES ($1,$2,$3,$4)`,
        [venta_id, item.producto_id, item.cantidad, prod.rows[0].precio_unitario]
      );
      await client.query(
        `UPDATE producto SET stock = stock - $1, updated_at = NOW() WHERE id_producto = $2`,
        [item.cantidad, item.producto_id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ ...ventaRes.rows[0], total });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;
