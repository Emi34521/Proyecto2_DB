// src/middleware/auth.js
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "jwt_secret_dev";

// ── Verifica el JWT ────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "Token requerido" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Formato: Bearer <token>" });

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// ── Verifica que el usuario tenga uno de los roles permitidos ──
// Uso: requireRole("admin", "supervisor")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado" });
    if (!roles.includes(req.user.tipo)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los roles: ${roles.join(", ")}`,
        tuRol: req.user.tipo,
      });
    }
    next();
  };
}

// ── Permisos por rol (para enviar al frontend) ─────────────────
const PERMISOS_ROL = {
  admin: {
    productos:   ["ver", "crear", "editar", "eliminar"],
    categorias:  ["ver", "crear", "editar", "eliminar"],
    proveedores: ["ver", "crear", "editar", "eliminar"],
    clientes:    ["ver", "crear", "editar", "eliminar"],
    empleados:   ["ver", "crear", "editar", "eliminar"],
    ventas:      ["ver", "crear", "cancelar"],
    compras:     ["ver", "crear"],
    reportes:    ["ver"],
    usuarios:    ["ver", "crear", "editar", "eliminar"],
  },
  vendedor: {
    productos:   ["ver"],
    categorias:  ["ver"],
    proveedores: ["ver"],
    clientes:    ["ver", "crear", "editar"],
    empleados:   ["ver"],
    ventas:      ["ver", "crear"],
    compras:     [],
    reportes:    ["ver"],
    usuarios:    [],
  },
  bodeguero: {
    productos:   ["ver", "editar"],
    categorias:  ["ver"],
    proveedores: ["ver"],
    clientes:    [],
    empleados:   [],
    ventas:      ["ver"],
    compras:     ["ver", "crear"],
    reportes:    ["ver"],
    usuarios:    [],
  },
  supervisor: {
    productos:   ["ver"],
    categorias:  ["ver"],
    proveedores: ["ver"],
    clientes:    ["ver"],
    empleados:   ["ver"],
    ventas:      ["ver", "cancelar"],
    compras:     ["ver"],
    reportes:    ["ver"],
    usuarios:    ["ver"],
  },
  consulta: {
    productos:   ["ver"],
    categorias:  ["ver"],
    proveedores: ["ver"],
    clientes:    ["ver"],
    empleados:   [],
    ventas:      ["ver"],
    compras:     [],
    reportes:    ["ver"],
    usuarios:    [],
  },
};

function getPermisos(tipo) {
  return PERMISOS_ROL[tipo] || {};
}

module.exports = { authMiddleware, requireRole, getPermisos };
