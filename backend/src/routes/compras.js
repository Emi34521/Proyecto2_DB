const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT c.id_compra, c.fecha, c.cantidad_compra, c.precio_mayor_unidad,
             p.nombre AS producto, pr.nombre AS proveedor
      FROM   compra    c
      JOIN   producto  p  ON c.id_producto  = p.id_producto
      JOIN   proveedor pr ON c.id_proveedor = pr.id_proveedor
      ORDER  BY c.fecha DESC
    `);
    res.json(r.rows);
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post("/", authMiddleware, async (req, res) => {
  const { id_proveedor, id_producto, cantidad_compra, precio_mayor_unidad } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `INSERT INTO compra(id_proveedor,id_producto,cantidad_compra,precio_mayor_unidad)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [id_proveedor,id_producto,cantidad_compra,precio_mayor_unidad]
    );
    // Sumar stock al producto
    await client.query(
      `UPDATE producto SET stock = stock + $1, updated_at = NOW() WHERE id_producto = $2`,
      [cantidad_compra, id_producto]
    );
    await client.query("COMMIT");
    res.status(201).json(r.rows[0]);
  } catch(e){
    await client.query("ROLLBACK");
    res.status(500).json({error:e.message});
  } finally { client.release(); }
});

module.exports = router;
