// routes/clientes.js — CRUD con ORM; creación vía stored procedure
const express  = require("express");
const router   = express.Router();
const { Cliente }  = require("../models");
const sequelize    = require("../config/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

// GET all — vendedor, admin, supervisor, consulta
router.get("/", authMiddleware,
  requireRole("admin", "vendedor", "supervisor", "consulta"),
  async (req, res) => {
    try {
      // ORM: findAll
      const clientes = await Cliente.findAll({ order: [["nombre", "ASC"]] });
      res.json(clientes);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// GET one
router.get("/:id", authMiddleware,
  requireRole("admin", "vendedor", "supervisor"),
  async (req, res) => {
    try {
      // ORM: findByPk
      const c = await Cliente.findByPk(req.params.id);
      if (!c) return res.status(404).json({ error: "Cliente no encontrado" });
      res.json(c);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// POST — vendedor y admin — usa stored procedure sp_crear_cliente
router.post("/", authMiddleware,
  requireRole("admin", "vendedor"),
  async (req, res) => {
    const { DPI, nombre, email, telefono, direccion } = req.body;
    if (!DPI || !nombre)
      return res.status(400).json({ error: "DPI y nombre son obligatorios" });

    const t = await sequelize.transaction();
    try {
      // SP con parámetro OUT — invocado con SQL explícito dentro del ORM
      const [result] = await sequelize.query(
        `CALL sp_crear_cliente(:dpi, :nombre, :email, :tel, :dir, NULL)`,
        {
          replacements: {
            dpi:    DPI,
            nombre,
            email:  email    || null,
            tel:    telefono || null,
            dir:    direccion || null,
          },
          transaction: t,
        }
      );
      await t.commit();

      const clienteId = result[0]?.p_cliente_id;
      // ORM: buscar el registro recién creado
      const nuevo = await Cliente.findByPk(clienteId);
      res.status(201).json(nuevo);
    } catch (e) {
      await t.rollback();
      res.status(400).json({ error: e.message });
    }
  }
);

// PUT — vendedor y admin — ORM
router.put("/:id", authMiddleware,
  requireRole("admin", "vendedor"),
  async (req, res) => {
    const { DPI, nombre, email, telefono, direccion } = req.body;
    const t = await sequelize.transaction();
    try {
      // ORM: findByPk + update
      const c = await Cliente.findByPk(req.params.id, { transaction: t });
      if (!c) {
        await t.rollback();
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      await c.update({ dpi: DPI, nombre, email, telefono, direccion }, { transaction: t });
      await t.commit();
      res.json(c);
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message });
    }
  }
);

// DELETE — solo admin — ORM
router.delete("/:id", authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const c = await Cliente.findByPk(req.params.id, { transaction: t });
      if (!c) {
        await t.rollback();
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      await c.destroy({ transaction: t });
      await t.commit();
      res.json({ message: "Cliente eliminado" });
    } catch (e) {
      await t.rollback();
      res.status(500).json({ error: e.message });
    }
  }
);

module.exports = router;
