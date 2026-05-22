// routes/categorias.js  — CRUD completo con ORM (Sequelize)
const express  = require("express");
const router   = express.Router();
const { Categoria } = require("../models");
const { authMiddleware, requireRole } = require("../middleware/auth");

// GET — cualquier rol autenticado puede ver
router.get("/", authMiddleware, async (req, res) => {
  try {
    // ORM: findAll
    const categorias = await Categoria.findAll({ order: [["nombre", "ASC"]] });
    res.json(categorias);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — solo admin
router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre obligatorio" });
  try {
    // ORM: create
    const nueva = await Categoria.create({ nombre, descripcion });
    res.status(201).json(nueva);
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError")
      return res.status(400).json({ error: "Ya existe una categoría con ese nombre" });
    res.status(500).json({ error: e.message });
  }
});

// PUT — solo admin
router.put("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  const { nombre, descripcion } = req.body;
  try {
    // ORM: findByPk + save
    const cat = await Categoria.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada" });
    cat.nombre      = nombre      ?? cat.nombre;
    cat.descripcion = descripcion ?? cat.descripcion;
    await cat.save();
    res.json(cat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — solo admin
router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    // ORM: destroy
    const cat = await Categoria.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: "Categoría no encontrada" });
    await cat.destroy();
    res.json({ message: "Categoría eliminada" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
