// ── categorias.js ────────────────────────────────────────────
const express  = require("express");
const router   = express.Router();
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try { res.json((await pool.query(`SELECT * FROM categoria ORDER BY nombre`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post("/", authMiddleware, async (req, res) => {
  const { nombre, descripcion } = req.body;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(`INSERT INTO categoria(nombre,descripcion) VALUES($1,$2) RETURNING *`,[nombre,descripcion]);
    await c.query("COMMIT"); res.status(201).json(r.rows[0]);
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});
router.put("/:id", authMiddleware, async (req, res) => {
  const { nombre, descripcion } = req.body;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(`UPDATE categoria SET nombre=$1,descripcion=$2 WHERE id_categoria=$3 RETURNING *`,[nombre,descripcion,req.params.id]);
    if(r.rowCount===0){await c.query("ROLLBACK");return res.status(404).json({error:"No encontrado"});}
    await c.query("COMMIT"); res.json(r.rows[0]);
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});
router.delete("/:id", authMiddleware, async (req, res) => {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(`DELETE FROM categoria WHERE id_categoria=$1 RETURNING id_categoria`,[req.params.id]);
    if(r.rowCount===0){await c.query("ROLLBACK");return res.status(404).json({error:"No encontrado"});}
    await c.query("COMMIT"); res.json({message:"Eliminado"});
  } catch(e){ await c.query("ROLLBACK"); res.status(500).json({error:e.message}); } finally{c.release();}
});

module.exports = router;
