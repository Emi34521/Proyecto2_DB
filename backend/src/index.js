require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { pool } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Health ──────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// ── Rutas ───────────────────────────────────────────────────
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

app.listen(PORT, () => console.log(`Backend en http://localhost:${PORT}`));
