const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || "proy2",
  password: process.env.DB_PASSWORD || "secret",
  database: process.env.DB_NAME     || "tienda_db",
});

pool.on("error", (err) => console.error("Pool error:", err));

module.exports = { pool };
