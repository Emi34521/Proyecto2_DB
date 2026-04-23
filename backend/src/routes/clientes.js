const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try { res.json((await pool.query(`SELECT * FROM cliente ORDER BY nombre`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM cliente WHERE id_cliente=$1`,[req.params.id]);
    if(r.rowCount===0) return res.status(404).json({error:"No encontrado"});
    res.json(r.rows[0]);
  } catch(e){ res.status(500).json({error:e.message}); }
});
router.post("/", authMiddleware, async (req, res) => {
  const { DPI, nombre, email, telefono, direccion } = req.body;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `INSERT INTO cliente(DPI,nombre,email,telefono,direccion) VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [DPI,nombre,email,telefono,direccion]
    );
    await c.query("COMMIT"); res.status(201).json(r.rows[0]);
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});
router.put("/:id", authMiddleware, async (req, res) => {
  const { DPI, nombre, email, telefono, direccion } = req.body;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `UPDATE cliente SET DPI=$1,nombre=$2,email=$3,telefono=$4,direccion=$5 WHERE id_cliente=$6 RETURNING *`,
      [DPI,nombre,email,telefono,direccion,req.params.id]
    );
    if(r.rowCount===0){await c.query("ROLLBACK");return res.status(404).json({error:"No encontrado"});}
    await c.query("COMMIT"); res.json(r.rows[0]);
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});
router.delete("/:id", authMiddleware, async (req, res) => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(`DELETE FROM cliente WHERE id_cliente=$1 RETURNING id_cliente`,[req.params.id]);
    if(r.rowCount===0){await c.query("ROLLBACK");return res.status(404).json({error:"No encontrado"});}
    await c.query("COMMIT"); res.json({message:"Eliminado"});
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});

module.exports = router;
