const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

// GET — JOIN producto + categoria + proveedor
router.get("/", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id_producto, p.nombre, p.descripcion,
             p.precio_unitario, p.stock,
             c.id_categoria, c.nombre  AS categoria,
             pr.id_proveedor, pr.nombre AS proveedor
      FROM   producto   p
      JOIN   categoria  c  ON p.categoria_id = c.id_categoria
      JOIN   proveedor  pr ON p.proveedor_id = pr.id_proveedor
      ORDER  BY p.nombre
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.*, c.nombre AS categoria, pr.nombre AS proveedor
       FROM   producto p
       JOIN   categoria  c  ON p.categoria_id = c.id_categoria
       JOIN   proveedor  pr ON p.proveedor_id = pr.id_proveedor
       WHERE  p.id_producto = $1`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", authMiddleware, async (req, res) => {
  const { nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `INSERT INTO producto (nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id]
    );
    await client.query("COMMIT");
    res.status(201).json(r.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `UPDATE producto
       SET nombre=$1, descripcion=$2, precio_unitario=$3, stock=$4,
           categoria_id=$5, proveedor_id=$6, updated_at=NOW()
       WHERE id_producto=$7 RETURNING *`,
      [nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id, req.params.id]
    );
    if (r.rowCount === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "No encontrado" }); }
    await client.query("COMMIT");
    res.json(r.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(`DELETE FROM producto WHERE id_producto=$1 RETURNING id_producto`, [req.params.id]);
    if (r.rowCount === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "No encontrado" }); }
    await client.query("COMMIT");
    res.json({ message: "Eliminado" });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;
