# Proyecto 3 — Sistema de Inventario y Ventas

## Levantar el proyecto

```bash
cp env.example .env
docker compose up --build
```

Disponible en **http://localhost:3000**

Para reiniciar limpiando datos:
```bash
docker compose down -v
docker compose up --build
```

---

## Credenciales de base de datos

```
DB_USER=proy3
DB_PASSWORD=secret
DB_NAME=tienda_db
```

---

## Usuarios de prueba — uno por cada rol

| Rol         | Correo                   | Contraseña |
|-------------|--------------------------|------------|
| admin       | admin@tienda.com         | Admin1234  |
| vendedor    | vendedor@tienda.com      | Admin1234  |
| bodeguero   | bodega@tienda.com        | Admin1234  |
| supervisor  | supervisor@tienda.com    | Admin1234  |
| consulta    | consulta@tienda.com      | Admin1234  |

---

## I. Esquema de roles en el DBMS

Los 5 roles se crean con `CREATE ROLE` en `db/init.sql` y los permisos se asignan con `GRANT` y `REVOKE` granulares por tabla y operación.

### Tabla de roles y permisos

| Rol | Tablas con SELECT | Tablas con INSERT | Tablas con UPDATE | Tablas con DELETE |
|---|---|---|---|---|
| `rol_admin` | todas | todas | todas | todas |
| `rol_vendedor` | producto, categoria, proveedor, empleado, cliente, venta, detalle_ventas | cliente, venta, detalle_ventas | cliente | — |
| `rol_bodeguero` | categoria, proveedor, producto, venta, compra | producto, compra | producto | — |
| `rol_supervisor` | todas | — | venta (solo campos `cancelada`, `total`) | — |
| `rol_consulta` | categoria, proveedor, cliente, producto, venta, detalle_ventas | — | — | — |

### Descripción de cada rol

**`rol_admin`**
Administrador total del sistema. Acceso completo de lectura y escritura sobre todas las tablas. Puede gestionar usuarios, empleados, categorías, proveedores, productos, clientes, ventas y compras.

**`rol_vendedor`**
Orientado a la atención al cliente y registro de ventas. Puede ver el catálogo completo (productos, categorías, proveedores), crear y editar clientes, y registrar ventas con su detalle. No puede crear ni eliminar productos, ni acceder a compras o usuarios.

**`rol_bodeguero`**
Orientado al control de inventario. Puede ver y actualizar el stock de productos, registrar compras a proveedores. No tiene acceso a ventas (solo lectura), clientes ni usuarios.

**`rol_supervisor`**
Acceso de lectura total sobre todas las tablas incluyendo usuarios. Además puede cancelar ventas (UPDATE sobre `venta.cancelada`). No puede crear ni eliminar registros.

**`rol_consulta`**
Solo lectura sobre tablas no sensibles: catálogo, clientes, ventas y su detalle. Sin acceso a la tabla `usuario`, `empleado` ni `compra`.

---

## II. Stored Procedures

Todos los SPs se invocan desde el backend mediante `sequelize.query()` dentro de transacciones explícitas con `BEGIN/COMMIT/ROLLBACK`.

| SP | Invocado desde | Descripción |
|---|---|---|
| `sp_registrar_venta(IN, IN, IN, OUT)` | `POST /api/ventas` | Registra venta completa, descuenta stock. Parámetro OUT: `p_venta_id`. Lanza excepción si stock insuficiente. |
| `sp_registrar_compra(IN, IN, IN, IN, OUT)` | `POST /api/compras` | Registra compra a proveedor e incrementa stock. Parámetro OUT: `p_compra_id`. |
| `sp_crear_producto(IN×6, OUT)` | `POST /api/productos` | Crea producto validando categoría y proveedor. Parámetro OUT: `p_producto_id`. |
| `sp_actualizar_stock(IN, IN, OUT)` | `PATCH /api/compras/ajuste-stock` | Ajuste manual de stock (positivo o negativo). Parámetro OUT: `p_stock_nuevo`. Lanza excepción si stock resultante < 0. |
| `sp_crear_cliente(IN×5, OUT)` | `POST /api/clientes` | Crea cliente validando DPI único. Parámetro OUT: `p_cliente_id`. |
| `sp_cancelar_venta(IN)` | `PATCH /api/ventas/:id/cancelar` | Cancela venta y restaura stock. Incluye transacción con ROLLBACK en excepción. |

### SP con parámetros IN/OUT y manejo de excepciones

`sp_registrar_venta` es el stored procedure principal. Recibe:
- `IN p_cliente_id INTEGER`
- `IN p_empleado_id INTEGER`
- `IN p_productos JSONB` — array con `{producto_id, cantidad}` por línea
- `OUT p_venta_id INTEGER` — ID de la venta creada

Lanza `RAISE EXCEPTION` si el cliente o empleado no existen, si algún producto no existe, o si el stock es insuficiente. El backend captura la excepción y hace `ROLLBACK` explícito.

### SP con transacción explícita y ROLLBACK dentro del SP

`sp_cancelar_venta` implementa su propia lógica de excepción con bloque `EXCEPTION WHEN OTHERS THEN RAISE`, que propaga el error para que el backend ejecute el `ROLLBACK` de la transacción Sequelize. Verifica que la venta exista y no esté ya cancelada antes de restaurar el stock línea por línea.

---

## III. ORM — Sequelize

Modelos definidos en `backend/src/models/`:

| Modelo | Tabla | Operaciones ORM usadas |
|---|---|---|
| `Categoria` | `categoria` | findAll, create, findByPk+save, destroy |
| `Cliente` | `cliente` | findAll, findByPk, update, destroy |
| `Producto` | `producto` | findAll (con include), findByPk, update, destroy |
| `Venta` | `venta` | findAll (con include), findByPk (con include anidado) |
| `Compra` | `compra` | findAll (con include), findByPk |
| `Usuario` | `usuario` | findOne, create, update, destroy |
| `Empleado` | `empleado` | findAll, create, update, destroy |
| `Proveedor` | `proveedor` | findAll, create, update, destroy |
| `DetalleVenta` | `detalle_ventas` | include anidado en Venta |

Las consultas avanzadas (reportes con CTEs, subqueries, window functions) se complementan con SQL explícito vía `sequelize.query()`.

---

## IV. Transacciones

Todas las operaciones de escritura usan transacciones explícitas mediante `sequelize.transaction()` con `await t.commit()` y `await t.rollback()` en el bloque catch. Los stored procedures que modifican múltiples tablas (ventas, compras, cancelación) también manejan excepciones internamente con `RAISE`.

---

## Estructura del proyecto

```
.
├── backend/
│   └── src/
│       ├── config/
│       │   └── database.js       # Configuración Sequelize
│       ├── middleware/
│       │   └── auth.js           # JWT + requireRole + PERMISOS_ROL
│       ├── models/               # 9 modelos Sequelize + index con asociaciones
│       └── routes/               # Endpoints por entidad
├── frontend/
│   ├── pages/                    # HTML por módulo + 403.html
│   ├── js/
│   │   ├── api.js                # Fetch + canDo() + session con permisos
│   │   └── layout.js             # Sidebar filtrado por rol + guardPage()
│   └── css/
├── db/
│   └── init.sql                  # Esquema + 5 roles + 6 SPs + datos de prueba
├── docker-compose.yml
└── .env.example
```
