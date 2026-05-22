// routes/proveedores.js
const express  = require("express");
const router   = express.Router();
const { Proveedor } = require("../models");
const sequelize = require("../config/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const rows = await Proveedor.findAll({ order: [["nombre", "ASC"]] });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const p = await Proveedor.create(req.body, { transaction: t });
    await t.commit();
    res.status(201).json(p);
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

router.put("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const p = await Proveedor.findByPk(req.params.id, { transaction: t });
    if (!p) { await t.rollback(); return res.status(404).json({ error: "No encontrado" }); }
    await p.update(req.body, { transaction: t });
    await t.commit();
    res.json(p);
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const p = await Proveedor.findByPk(req.params.id, { transaction: t });
    if (!p) { await t.rollback(); return res.status(404).json({ error: "No encontrado" }); }
    await p.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Eliminado" });
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

module.exports = router;
