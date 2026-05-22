// routes/usuarios.js — solo admin
const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const { Usuario } = require("../models");
const sequelize   = require("../config/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

router.get("/", authMiddleware, requireRole("admin", "supervisor"), async (req, res) => {
  try {
    const rows = await Usuario.findAll({
      attributes: ["id_usuario", "nombre", "correo", "telefono", "tipo_usuario"],
      order: [["nombre", "ASC"]],
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  const { nombre, correo, telefono, contrasena, tipo_usuario } = req.body;
  if (!contrasena) return res.status(400).json({ error: "Contraseña requerida" });
  const t = await sequelize.transaction();
  try {
    const hash = await bcrypt.hash(contrasena, 10);
    const u = await Usuario.create(
      { nombre, correo, telefono, contrasena_hash: hash, tipo_usuario },
      { transaction: t }
    );
    await t.commit();
    res.status(201).json({
      id_usuario: u.id_usuario, nombre: u.nombre,
      correo: u.correo, tipo_usuario: u.tipo_usuario,
    });
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

router.put("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const { nombre, correo, telefono, tipo_usuario, contrasena } = req.body;
  const t = await sequelize.transaction();
  try {
    const u = await Usuario.findByPk(req.params.id, { transaction: t });
    if (!u) { await t.rollback(); return res.status(404).json({ error: "No encontrado" }); }
    const updates = { nombre, correo, telefono, tipo_usuario };
    if (contrasena) updates.contrasena_hash = await bcrypt.hash(contrasena, 10);
    await u.update(updates, { transaction: t });
    await t.commit();
    res.json({ id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo, tipo_usuario: u.tipo_usuario });
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const u = await Usuario.findByPk(req.params.id, { transaction: t });
    if (!u) { await t.rollback(); return res.status(404).json({ error: "No encontrado" }); }
    await u.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Eliminado" });
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

module.exports = router;
