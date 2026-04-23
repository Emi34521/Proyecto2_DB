const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "Token requerido" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Formato: Bearer <token>" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "jwt_secret_dev");
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

module.exports = { authMiddleware };
