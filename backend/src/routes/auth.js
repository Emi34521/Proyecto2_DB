// routes/auth.js
const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { Usuario } = require("../models");
const { getPermisos } = require("../middleware/auth");

const SECRET = process.env.JWT_SECRET || "jwt_secret_dev";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena)
    return res.status(400).json({ error: "Correo y contraseña requeridos" });

  try {
    // ORM: buscar usuario por correo
    const user = await Usuario.findOne({ where: { correo } });
    if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });

    const valid = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!valid) return res.status(401).json({ error: "Credenciales incorrectas" });

    const payload = {
      id:     user.id_usuario,
      nombre: user.nombre,
      tipo:   user.tipo_usuario,
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: "8h" });

    res.json({
      token,
      usuario: {
        id:       user.id_usuario,
        nombre:   user.nombre,
        correo:   user.correo,
        tipo:     user.tipo_usuario,
        permisos: getPermisos(user.tipo_usuario),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ message: "Sesión cerrada correctamente" });
});

module.exports = router;
