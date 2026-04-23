const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const { pool } = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id_usuario, nombre, correo, telefono, tipo_usuario FROM usuario ORDER BY nombre`
    );
    res.json(r.rows);
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post("/", authMiddleware, async (req, res) => {
  const { nombre, correo, telefono, contrasena, tipo_usuario } = req.body;
  if (!contrasena) return res.status(400).json({ error: "Contraseña requerida" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hash = await bcrypt.hash(contrasena, 10);
    const r = await client.query(
      `INSERT INTO usuario(nombre,correo,telefono,contrasena_hash,tipo_usuario)
       VALUES($1,$2,$3,$4,$5) RETURNING id_usuario,nombre,correo,tipo_usuario`,
      [nombre, correo, telefono, hash, tipo_usuario]
    );
    await client.query("COMMIT");
    res.status(201).json(r.rows[0]);
  } catch(e){
    await client.query("ROLLBACK");
    res.status(500).json({error:e.message});
  } finally { client.release(); }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { nombre, correo, telefono, tipo_usuario, contrasena } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let r;
    if (contrasena) {
      const hash = await bcrypt.hash(contrasena, 10);
      r = await client.query(
        `UPDATE usuario SET nombre=$1,correo=$2,telefono=$3,tipo_usuario=$4,contrasena_hash=$5
         WHERE id_usuario=$6 RETURNING id_usuario,nombre,correo,tipo_usuario`,
        [nombre, correo, telefono, tipo_usuario, hash, req.params.id]
      );
    } else {
      r = await client.query(
        `UPDATE usuario SET nombre=$1,correo=$2,telefono=$3,tipo_usuario=$4
         WHERE id_usuario=$5 RETURNING id_usuario,nombre,correo,tipo_usuario`,
        [nombre, correo, telefono, tipo_usuario, req.params.id]
      );
    }
    if(r.rowCount===0){ await client.query("ROLLBACK"); return res.status(404).json({error:"No encontrado"}); }
    await client.query("COMMIT");
    res.json(r.rows[0]);
  } catch(e){
    await client.query("ROLLBACK");
    res.status(500).json({error:e.message});
  } finally { client.release(); }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(`DELETE FROM usuario WHERE id_usuario=$1 RETURNING id_usuario`,[req.params.id]);
    if(r.rowCount===0){ await client.query("ROLLBACK"); return res.status(404).json({error:"No encontrado"}); }
    await client.query("COMMIT");
    res.json({message:"Eliminado"});
  } catch(e){
    await client.query("ROLLBACK");
    res.status(500).json({error:e.message});
  } finally { client.release(); }
});

module.exports = router;
