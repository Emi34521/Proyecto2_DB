# Proyecto2_DB
# Proyecto 2 — Sistema de Inventario y Ventas

Aplicación web para gestionar el inventario y las ventas de una tienda. Incluye autenticación de usuarios, CRUD de entidades, registro de ventas y compras, y reportes con exportación a CSV.

**Stack:** PostgreSQL 16 · Node.js / Express · HTML/CSS/JS vanilla · Docker

---

## Requisitos previos

- [Docker](https://www.docker.com/) y Docker Compose instalados.

---

## Levantar el proyecto

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd <nombre-del-repositorio>

# 2. Crear el archivo de variables de entorno
cp .env.example .env

# 3. Levantar todos los servicios
docker compose up --build
```

La primera vez puede tardar un par de minutos mientras se construyen las imágenes y se inicializa la base de datos.

Una vez levantado, la aplicación estará disponible en: **http://localhost:3000**

---

## Credenciales de acceso

| Rol       | Correo                  | Contraseña |
|-----------|-------------------------|------------|
| Admin     | admin@tienda.com        | Admin1234  |
| Vendedor  | vendedor@tienda.com     | Admin1234  |
| Bodeguero | bodega@tienda.com       | Admin1234  |

---

## Funcionalidades principales

- **Dashboard** con resumen general: ventas, productos, clientes y stock crítico.
- **CRUD completo** de Productos, Clientes, Empleados, Proveedores y Categorías.
- **Registro de ventas** con carrito de productos y descuento automático de stock.
- **Registro de compras** a proveedores con incremento automático de stock.
- **Reportes:** ventas por día, top productos, ranking de categorías, margen de ganancia, stock bajo, clientes sin compra, productos sin venta y ventas por empleado.
- **Exportación a CSV** de ventas y productos desde la UI.
- **Autenticación** con JWT (login / logout).

---

## Estructura del proyecto

```
.
├── backend/        # API REST en Node.js / Express
│   └── src/
│       ├── routes/ # Endpoints por entidad
│       └── index.js
├── frontend/       # Interfaz estática servida por Express
│   ├── pages/      # Páginas HTML por módulo
│   ├── js/         # api.js y layout.js compartidos
│   └── css/
├── db/
│   └── init.sql    # Esquema completo + datos de prueba
├── docker-compose.yml
└── .env.example
```

---

## Variables de entorno

El archivo `.env.example` contiene todas las variables necesarias. Las credenciales de base de datos son fijas para calificación:

```
DB_USER=proy2
DB_PASSWORD=secret
DB_NAME=tienda_db
```

No modificar `DB_USER` ni `DB_PASSWORD`.

---

## Detener el proyecto

```bash
docker compose down
```

Para eliminar también los datos persistidos:

```bash
docker compose down -v
```