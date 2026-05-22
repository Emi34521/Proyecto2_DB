// routes/compras.js — usa stored procedures
const express   = require("express");
const router    = express.Router();
const sequelize = require("../config/database");
const { Compra, Producto, Proveedor } = require("../models");
const { authMiddleware, requireRole } = require("../middleware/auth");

// GET all
router.get("/", authMiddleware,
  requireRole("admin", "bodeguero", "supervisor"),
  async (req, res) => {
    try {
      const compras = await Compra.findAll({
        include: [
          { model: Producto,  as: "producto",  attributes: ["nombre"] },
          { model: Proveedor, as: "proveedor", attributes: ["nombre"] },
        ],
        order: [["fecha", "DESC"]],
      });
      res.json(compras);
    } catch (e) { res.status(500).json({ error: e.message }); }
  }
);

// POST — bodeguero y admin — SP sp_registrar_compra
router.post("/", authMiddleware,
  requireRole("admin", "bodeguero"),
  async (req, res) => {
    const { id_proveedor, id_producto, cantidad_compra, precio_mayor_unidad } = req.body;
    const t = await sequelize.transaction();
    try {
      const [result] = await sequelize.query(
        `CALL sp_registrar_compra(:prov_id, :prod_id, :cantidad, :precio, NULL)`,
        {
          replacements: {
            prov_id:  id_proveedor,
            prod_id:  id_producto,
            cantidad: cantidad_compra,
            precio:   precio_mayor_unidad,
          },
          transaction: t,
        }
      );
      await t.commit();

      const compraId = result[0]?.p_compra_id;
      const nueva = await Compra.findByPk(compraId, {
        include: [
          { model: Producto,  as: "producto",  attributes: ["nombre"] },
          { model: Proveedor, as: "proveedor", attributes: ["nombre"] },
        ],
      });
      res.status(201).json(nueva);
    } catch (e) {
      await t.rollback();
      res.status(400).json({ error: e.message });
    }
  }
);

// PATCH /ajuste-stock — bodeguero y admin — SP sp_actualizar_stock
router.patch("/ajuste-stock", authMiddleware,
  requireRole("admin", "bodeguero"),
  async (req, res) => {
    const { producto_id, ajuste } = req.body;
    const t = await sequelize.transaction();
    try {
      const [result] = await sequelize.query(
        `CALL sp_actualizar_stock(:prod_id, :ajuste, NULL)`,
        {
          replacements: { prod_id: producto_id, ajuste },
          transaction: t,
        }
      );
      await t.commit();
      res.json({ stock_nuevo: result[0]?.p_stock_nuevo, message: "Stock ajustado correctamente" });
    } catch (e) {
      await t.rollback();
      res.status(400).json({ error: e.message });
    }
  }
);

module.exports = router;
