const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try { res.json((await pool.query(`SELECT * FROM proveedor ORDER BY nombre`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/", authMiddleware, async (req, res) => {
  const { nombre, contacto, telefono, email, ubicacion } = req.body;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `INSERT INTO proveedor(nombre,contacto,telefono,email,ubicacion) VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [nombre,contacto,telefono,email,ubicacion]
    );
    await c.query("COMMIT"); res.status(201).json(r.rows[0]);
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});
router.put("/:id", authMiddleware, async (req, res) => {
  const { nombre, contacto, telefono, email, ubicacion } = req.body;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `UPDATE proveedor SET nombre=$1,contacto=$2,telefono=$3,email=$4,ubicacion=$5 WHERE id_proveedor=$6 RETURNING *`,
      [nombre,contacto,telefono,email,ubicacion,req.params.id]
    );
    if(r.rowCount===0){await c.query("ROLLBACK");return res.status(404).json({error:"No encontrado"});}
    await c.query("COMMIT"); res.json(r.rows[0]);
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});
router.delete("/:id", authMiddleware, async (req, res) => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(`DELETE FROM proveedor WHERE id_proveedor=$1 RETURNING id_proveedor`,[req.params.id]);
    if(r.rowCount===0){await c.query("ROLLBACK");return res.status(404).json({error:"No encontrado"});}
    await c.query("COMMIT"); res.json({message:"Eliminado"});
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});

module.exports = router;
