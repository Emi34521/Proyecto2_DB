const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Usuario = sequelize.define("Usuario", {
  id_usuario:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:          { type: DataTypes.STRING(150), allowNull: false },
  correo:          { type: DataTypes.STRING(200), allowNull: false, unique: true },
  telefono:        { type: DataTypes.STRING(20) },
  contrasena_hash: { type: DataTypes.STRING(255), allowNull: false },
  tipo_usuario:    {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [["admin", "vendedor", "bodeguero", "supervisor", "consulta"]],
    },
  },
}, {
  tableName: "usuario",
  timestamps: false,
});

module.exports = Usuario;
