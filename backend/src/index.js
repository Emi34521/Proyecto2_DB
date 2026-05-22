// backend/src/index.js
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { sequelize } = require("./models");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Rutas API ─────────────────────────────────────────────────
app.use("/api/auth",        require("./routes/auth"));
app.use("/api/categorias",  require("./routes/categorias"));
app.use("/api/proveedores", require("./routes/proveedores"));
app.use("/api/productos",   require("./routes/productos"));
app.use("/api/clientes",    require("./routes/clientes"));
app.use("/api/empleados",   require("./routes/empleados"));
app.use("/api/ventas",      require("./routes/ventas"));
app.use("/api/compras",     require("./routes/compras"));
app.use("/api/reportes",    require("./routes/reportes"));
app.use("/api/usuarios",    require("./routes/usuarios"));

// ── Health ────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", db: "connected", orm: "sequelize" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// ── Servir frontend estático ──────────────────────────────────
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ── Iniciar servidor ──────────────────────────────────────────
// Sequelize solo autentica la conexión (sin sync forzado, el init.sql ya crea las tablas)
sequelize.authenticate()
  .then(() => {
    console.log("✓ Sequelize conectado a PostgreSQL");
    app.listen(PORT, () => console.log(`Backend en http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error("✗ Error de conexión Sequelize:", e.message);
    process.exit(1);
  });
