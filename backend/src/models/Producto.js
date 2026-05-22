// routes/productos.js — ORM + stored procedure para creación
const express  = require("express");
const router   = express.Router();
const { Producto, Categoria, Proveedor } = require("../models");
const sequelize = require("../config/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

// GET all — con JOIN vía ORM (include)
router.get("/", authMiddleware, async (req, res) => {
  try {
    // ORM: findAll con includes (JOIN)
    const productos = await Producto.findAll({
      include: [
        { model: Categoria, as: "categoria", attributes: ["id_categoria", "nombre"] },
        { model: Proveedor, as: "proveedor", attributes: ["id_proveedor", "nombre"] },
      ],
      order: [["nombre", "ASC"]],
    });
    res.json(productos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET one
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    // ORM: findByPk con includes
    const p = await Producto.findByPk(req.params.id, {
      include: [
        { model: Categoria, as: "categoria", attributes: ["id_categoria", "nombre"] },
        { model: Proveedor, as: "proveedor", attributes: ["id_proveedor", "nombre"] },
      ],
    });
    if (!p) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — admin — usa stored procedure sp_crear_producto
router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  const { nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id } = req.body;
  const t = await sequelize.transaction();
  try {
    // Invoca fn_crear_producto (valida categoría, proveedor y precio)
    const [result] = await sequelize.query(
      `SELECT fn_crear_producto(:nombre, :desc, :precio, :stock, :cat_id, :prov_id) AS producto_id`,
      {
        replacements: {
          nombre,
          desc:    descripcion    || null,
          precio:  precio_unitario,
          stock:   stock          || 0,
          cat_id:  categoria_id,
          prov_id: proveedor_id,
        },
        transaction: t,
      }
    );
    await t.commit();

    const productoId = result[0]?.producto_id;
    const nuevo = await Producto.findByPk(productoId, {
      include: [
        { model: Categoria, as: "categoria", attributes: ["id_categoria", "nombre"] },
        { model: Proveedor, as: "proveedor", attributes: ["id_proveedor", "nombre"] },
      ],
    });
    res.status(201).json(nuevo);
  } catch (e) {
    await t.rollback();
    res.status(400).json({ error: e.message });
  }
});

// PUT — admin y bodeguero — ORM
router.put("/:id", authMiddleware, requireRole("admin", "bodeguero"), async (req, res) => {
  const { nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id } = req.body;
  const t = await sequelize.transaction();
  try {
    const p = await Producto.findByPk(req.params.id, { transaction: t });
    if (!p) { await t.rollback(); return res.status(404).json({ error: "Producto no encontrado" }); }

    // bodeguero solo puede actualizar stock
    if (req.user.tipo === "bodeguero") {
      await p.update({ stock, updated_at: new Date() }, { transaction: t });
    } else {
      await p.update(
        { nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id, updated_at: new Date() },
        { transaction: t }
      );
    }
    await t.commit();

    const actualizado = await Producto.findByPk(req.params.id, {
      include: [
        { model: Categoria, as: "categoria", attributes: ["id_categoria", "nombre"] },
        { model: Proveedor, as: "proveedor", attributes: ["id_proveedor", "nombre"] },
      ],
    });
    res.json(actualizado);
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
});

// DELETE — solo admin — ORM
router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const p = await Producto.findByPk(req.params.id, { transaction: t });
    if (!p) { await t.rollback(); return res.status(404).json({ error: "Producto no encontrado" }); }
    await p.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Producto eliminado" });
  } catch (e) {
    await t.rollback();
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
