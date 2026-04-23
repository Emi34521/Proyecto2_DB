const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { pool } = require("../db");

const SECRET = process.env.JWT_SECRET || "jwt_secret_dev";

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body;
  console.log("LOGIN ATTEMPT:", { correo, contrasena });
  if (!correo || !contrasena)
    return res.status(400).json({ error: "Correo y contraseña requeridos" });

  try {
    const result = await pool.query(
      `SELECT id_usuario, nombre, correo, contrasena_hash, tipo_usuario
       FROM usuario WHERE correo = $1`,
      [correo]
    );

    if (result.rowCount === 0)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(contrasena, user.contrasena_hash);

    if (!valid)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: user.id_usuario, nombre: user.nombre, tipo: user.tipo_usuario },
      SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id:     user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        tipo:   user.tipo_usuario,
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