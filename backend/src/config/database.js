const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME     || "tienda_db",
  process.env.DB_USER     || "proy3",
  process.env.DB_PASSWORD || "secret",
  {
    host:    process.env.DB_HOST || "localhost",
    port:    parseInt(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    logging: false, // cambiar a console.log para depurar queries
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
