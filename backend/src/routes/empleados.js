// routes/empleados.js
const express  = require("express");
const router   = express.Router();
const { Empleado } = require("../models");
const sequelize    = require("../config/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

router.get("/", authMiddleware,
  requireRole("admin", "vendedor", "supervisor"),
  async (req, res) => {
    try {
      const rows = await Empleado.findAll({ order: [["nombre", "ASC"]] });
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const e = await Empleado.create(req.body, { transaction: t });
    await t.commit();
    res.status(201).json(e);
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

router.put("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const emp = await Empleado.findByPk(req.params.id, { transaction: t });
    if (!emp) { await t.rollback(); return res.status(404).json({ error: "No encontrado" }); }
    await emp.update(req.body, { transaction: t });
    await t.commit();
    res.json(emp);
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const emp = await Empleado.findByPk(req.params.id, { transaction: t });
    if (!emp) { await t.rollback(); return res.status(404).json({ error: "No encontrado" }); }
    await emp.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Eliminado" });
  } catch (e) { await t.rollback(); res.status(500).json({ error: e.message }); }
});

module.exports = router;
