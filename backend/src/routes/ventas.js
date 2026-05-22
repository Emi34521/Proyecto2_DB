// routes/ventas.js — usa stored procedures para registrar y cancelar
const express   = require("express");
const router    = express.Router();
const sequelize = require("../config/database");
const { Venta, Cliente, Empleado, DetalleVenta, Producto } = require("../models");
const { authMiddleware, requireRole } = require("../middleware/auth");

// GET all
router.get("/", authMiddleware,
  requireRole("admin", "vendedor", "supervisor", "consulta", "bodeguero"),
  async (req, res) => {
    try {
      const ventas = await Venta.findAll({
        include: [
          { model: Cliente,  as: "cliente",  attributes: ["nombre", "dpi"] },
          { model: Empleado, as: "empleado", attributes: ["nombre", "cargo"] },
        ],
        order: [["fecha", "DESC"]],
      });
      res.json(ventas);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// GET one con detalle
router.get("/:id", authMiddleware,
  requireRole("admin", "vendedor", "supervisor", "consulta", "bodeguero"),
  async (req, res) => {
    try {
      const venta = await Venta.findByPk(req.params.id, {
        include: [
          { model: Cliente,     as: "cliente",  attributes: ["nombre", "dpi"] },
          { model: Empleado,    as: "empleado", attributes: ["nombre", "cargo"] },
          {
            model: DetalleVenta, as: "detalle",
            include: [{ model: Producto, as: "producto", attributes: ["nombre"] }],
          },
        ],
      });
      if (!venta) return res.status(404).json({ error: "Venta no encontrada" });
      res.json(venta);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// POST — vendedor y admin — invoca sp_registrar_venta (SP con OUT + transacción)
router.post("/", authMiddleware,
  requireRole("admin", "vendedor"),
  async (req, res) => {
    const { cliente_id, empleado_id, items } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ error: "Debe incluir al menos un producto" });

    const t = await sequelize.transaction();
    try {
      // Llamada al stored procedure con JSONB
      const productosJson = JSON.stringify(
        items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
      );

      const [result] = await sequelize.query(
        `CALL sp_registrar_venta(:cliente_id, :empleado_id, :productos::jsonb, NULL)`,
        {
          replacements: {
            cliente_id,
            empleado_id,
            productos: productosJson,
          },
          transaction: t,
        }
      );

      await t.commit();
      const ventaId = result[0]?.p_venta_id;
      const nuevaVenta = await Venta.findByPk(ventaId, {
        include: [
          { model: Cliente,  as: "cliente",  attributes: ["nombre", "dpi"] },
          { model: Empleado, as: "empleado", attributes: ["nombre", "cargo"] },
        ],
      });
      res.status(201).json(nuevaVenta);
    } catch (e) {
      await t.rollback();
      res.status(400).json({ error: e.message });
    }
  }
);

// PATCH /:id/cancelar — supervisor y admin — invoca sp_cancelar_venta
router.patch("/:id/cancelar", authMiddleware,
  requireRole("admin", "supervisor"),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const [result] = await sequelize.query(
        `SELECT sp_cancelar_venta(:id) AS mensaje`,
        { replacements: { id: req.params.id }, transaction: t }
      );
      await t.commit();
      res.json({ message: result[0]?.mensaje });
    } catch (e) {
      await t.rollback();
      res.status(400).json({ error: e.message });
    }
  }
);

module.exports = router;
  