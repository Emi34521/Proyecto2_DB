-- =============================================================
--  ESQUEMA COMPLETO — TIENDA  (Proyecto 3)
--  PostgreSQL 16
--  Usuario principal: proy3 | Contraseña: secret
-- =============================================================

-- ── Limpiar objetos previos ───────────────────────────────────
DROP TABLE IF EXISTS compra          CASCADE;
DROP TABLE IF EXISTS detalle_ventas  CASCADE;
DROP TABLE IF EXISTS venta           CASCADE;
DROP TABLE IF EXISTS producto        CASCADE;
DROP TABLE IF EXISTS categoria       CASCADE;
DROP TABLE IF EXISTS proveedor       CASCADE;
DROP TABLE IF EXISTS cliente         CASCADE;
DROP TABLE IF EXISTS empleado        CASCADE;
DROP TABLE IF EXISTS usuario         CASCADE;
DROP VIEW  IF EXISTS v_ventas_detalle;
DROP VIEW  IF EXISTS v_stock_bajo;
DROP VIEW  IF EXISTS v_resumen_ventas_empleado;

DROP PROCEDURE IF EXISTS sp_registrar_venta;
DROP PROCEDURE IF EXISTS sp_registrar_compra;
DROP PROCEDURE IF EXISTS sp_crear_producto;
DROP PROCEDURE IF EXISTS sp_actualizar_stock;
DROP PROCEDURE IF EXISTS sp_crear_cliente;
DROP FUNCTION  IF EXISTS sp_cancelar_venta;

-- ── Limpiar roles previos (ignorar error si no existen) ───────
DO $$
BEGIN
  -- Revocar privilegios antes de eliminar roles
  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM rol_admin';
  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM rol_vendedor';
  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM rol_bodeguero';
  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM rol_supervisor';
  EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM rol_consulta';
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

DO $$ BEGIN DROP ROLE IF EXISTS rol_admin;     EXCEPTION WHEN OTHERS THEN NULL; END$$;
DO $$ BEGIN DROP ROLE IF EXISTS rol_vendedor;  EXCEPTION WHEN OTHERS THEN NULL; END$$;
DO $$ BEGIN DROP ROLE IF EXISTS rol_bodeguero; EXCEPTION WHEN OTHERS THEN NULL; END$$;
DO $$ BEGIN DROP ROLE IF EXISTS rol_supervisor;EXCEPTION WHEN OTHERS THEN NULL; END$$;
DO $$ BEGIN DROP ROLE IF EXISTS rol_consulta;  EXCEPTION WHEN OTHERS THEN NULL; END$$;

--  TABLAS

CREATE TABLE categoria (
  id_categoria  SERIAL       PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  descripcion   TEXT
);

CREATE TABLE proveedor (
  id_proveedor  SERIAL       PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  contacto      VARCHAR(150),
  telefono      VARCHAR(20),
  email         VARCHAR(150),
  ubicacion     VARCHAR(150)
);

CREATE TABLE cliente (
  id_cliente  SERIAL       PRIMARY KEY,
  DPI         VARCHAR(150) NOT NULL UNIQUE,
  nombre      VARCHAR(150) NOT NULL,
  email       VARCHAR(150),
  telefono    VARCHAR(20),
  direccion   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE empleado (
  id_empleado  SERIAL       PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  cargo        VARCHAR(100),
  email        VARCHAR(150) UNIQUE,
  telefono     VARCHAR(20),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE producto (
  id_producto      SERIAL        PRIMARY KEY,
  nombre           VARCHAR(150)  NOT NULL,
  descripcion      TEXT,
  precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  stock            INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  categoria_id     INTEGER       NOT NULL REFERENCES categoria(id_categoria),
  proveedor_id     INTEGER       NOT NULL REFERENCES proveedor(id_proveedor),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE venta (
  id_venta    SERIAL        PRIMARY KEY,
  cliente_id  INTEGER       NOT NULL REFERENCES cliente(id_cliente),
  empleado_id INTEGER       NOT NULL REFERENCES empleado(id_empleado),
  fecha       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  cancelada   BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE TABLE detalle_ventas (
  id_detalle      SERIAL        PRIMARY KEY,
  venta_id        INTEGER       NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
  producto_id     INTEGER       NOT NULL REFERENCES producto(id_producto),
  cantidad        INTEGER       NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL
);

CREATE TABLE compra (
  id_compra            SERIAL        PRIMARY KEY,
  id_proveedor         INTEGER       NOT NULL REFERENCES proveedor(id_proveedor),
  id_producto          INTEGER       NOT NULL REFERENCES producto(id_producto),
  cantidad_compra      INTEGER       NOT NULL CHECK (cantidad_compra > 0),
  precio_mayor_unidad  NUMERIC(10,2) NOT NULL,
  fecha                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE usuario (
  id_usuario       SERIAL       PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  correo           VARCHAR(200) NOT NULL UNIQUE,
  telefono         VARCHAR(20),
  contrasena_hash  VARCHAR(255) NOT NULL,
  -- tipo_usuario mapea al rol del DBMS
  tipo_usuario     VARCHAR(20)  NOT NULL
    CHECK (tipo_usuario IN ('admin','vendedor','bodeguero','supervisor','consulta'))
);

--  ÍNDICES
CREATE INDEX idx_producto_categoria ON producto(categoria_id);
CREATE INDEX idx_venta_fecha        ON venta(fecha);
CREATE INDEX idx_detalle_venta      ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto   ON detalle_ventas(producto_id);
CREATE INDEX idx_compra_proveedor   ON compra(id_proveedor);

--  VISTAS

CREATE VIEW v_ventas_detalle AS
SELECT
  v.id_venta,
  v.fecha,
  v.total,
  v.cancelada,
  c.nombre      AS cliente,
  c.DPI,
  e.nombre      AS empleado,
  e.cargo,
  p.nombre      AS producto,
  dv.cantidad,
  dv.precio_unitario,
  (dv.cantidad * dv.precio_unitario) AS subtotal
FROM venta v
JOIN cliente        c  ON v.cliente_id   = c.id_cliente
JOIN empleado       e  ON v.empleado_id  = e.id_empleado
JOIN detalle_ventas dv ON dv.venta_id    = v.id_venta
JOIN producto       p  ON dv.producto_id = p.id_producto;

CREATE VIEW v_stock_bajo AS
SELECT
  p.id_producto,
  p.nombre,
  p.stock,
  p.precio_unitario,
  cat.nombre AS categoria,
  pr.nombre  AS proveedor,
  pr.telefono AS telefono_proveedor
FROM producto p
JOIN categoria cat ON p.categoria_id = cat.id_categoria
JOIN proveedor pr  ON p.proveedor_id = pr.id_proveedor
WHERE p.stock <= 5;

CREATE VIEW v_resumen_ventas_empleado AS
SELECT
  e.id_empleado,
  e.nombre     AS empleado,
  e.cargo,
  COUNT(v.id_venta)          AS total_ventas,
  COALESCE(SUM(v.total), 0)  AS monto_total
FROM empleado e
LEFT JOIN venta v ON v.empleado_id = e.id_empleado AND v.cancelada = FALSE
GROUP BY e.id_empleado, e.nombre, e.cargo;

--  ROLES DEL DBMS
--
--  Documentación de roles:
--  rol_admin: Administrador total. SELECT/INSERT/UPDATE/DELETE en todas las tablas.
--  Gestiona usuarios, empleados, categorías, proveedores.
--  rol_vendedor: Gestiona ventas y clientes. SELECT en producto/categoria/proveedor/empleado. 
-- INSERT/SELECT en venta/detalle_ventas/cliente. Sin acceso a compra, usuario ni empleado (escritura).

--  rol_bodeguero: Gestiona inventario y compras. SELECT/INSERT en compra. SELECT/UPDATE(stock) en producto. 
--  Sin acceso a venta ni usuario.
-- rol_supervisor: Lectura total + puede cancelar ventas (UPDATE venta.cancelada). SELECT en todas las tablas y vistas.
-- UPDATE en venta.
-- rol_consulta: Solo lectura en tablas no sensibles: producto, categoria, proveedor, cliente, venta, detalle_ventas. Sin acceso a usuario.


-- Crear los 5 roles
CREATE ROLE rol_admin;
CREATE ROLE rol_vendedor;
CREATE ROLE rol_bodeguero;
CREATE ROLE rol_supervisor;
CREATE ROLE rol_consulta;

-- ── rol_admin: acceso total ────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  categoria, proveedor, cliente, empleado, producto,
  venta, detalle_ventas, compra, usuario
TO rol_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rol_admin;

-- ── rol_vendedor: ventas y clientes ───────────────────────────
GRANT SELECT ON producto, categoria, proveedor, empleado TO rol_vendedor;
GRANT SELECT, INSERT, UPDATE ON cliente TO rol_vendedor;
GRANT SELECT, INSERT ON venta, detalle_ventas TO rol_vendedor;
GRANT USAGE, SELECT ON SEQUENCE venta_id_venta_seq TO rol_vendedor;
GRANT USAGE, SELECT ON SEQUENCE detalle_ventas_id_detalle_seq TO rol_vendedor;
GRANT USAGE, SELECT ON SEQUENCE cliente_id_cliente_seq TO rol_vendedor;

-- ── rol_bodeguero: inventario y compras ───────────────────────
GRANT SELECT ON categoria, proveedor, venta TO rol_bodeguero;
GRANT SELECT, INSERT, UPDATE ON producto TO rol_bodeguero;
GRANT SELECT, INSERT ON compra TO rol_bodeguero;
GRANT USAGE, SELECT ON SEQUENCE producto_id_producto_seq TO rol_bodeguero;
GRANT USAGE, SELECT ON SEQUENCE compra_id_compra_seq TO rol_bodeguero;

-- ── rol_supervisor: lectura total + cancelar ventas ───────────
GRANT SELECT ON
  categoria, proveedor, cliente, empleado, producto,
  venta, detalle_ventas, compra, usuario
TO rol_supervisor;
GRANT UPDATE (cancelada, total) ON venta TO rol_supervisor;

-- ── rol_consulta: solo lectura en tablas no sensibles ─────────
GRANT SELECT ON
  categoria, proveedor, cliente, producto,
  venta, detalle_ventas
TO rol_consulta;
-- Sin acceso a: usuario, empleado, compra

-- Permisos sobre vistas para todos los roles
GRANT SELECT ON v_ventas_detalle, v_stock_bajo, v_resumen_ventas_empleado
  TO rol_admin, rol_vendedor, rol_bodeguero, rol_supervisor, rol_consulta;

--  STORED PROCEDURES

-- ─────────────────────────────────────────────────────────────
-- SP 1: sp_registrar_venta
--   Registra una venta completa con su detalle y descuenta
--   stock en una sola transacción. Lanza excepción si hay
--   stock insuficiente o el producto no existe.
--   Parámetros IN:  p_cliente_id, p_empleado_id,
--                   p_productos (JSON: [{producto_id, cantidad}])
--   Parámetro OUT:  p_venta_id (id de la venta creada)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
  IN  p_cliente_id  INTEGER,
  IN  p_empleado_id INTEGER,
  IN  p_productos   JSONB,
  OUT p_venta_id    INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_item          JSONB;
  v_producto_id   INTEGER;
  v_cantidad      INTEGER;
  v_precio        NUMERIC(10,2);
  v_stock_actual  INTEGER;
  v_total         NUMERIC(12,2) := 0;
BEGIN
  -- Validar cliente y empleado
  IF NOT EXISTS (SELECT 1 FROM cliente  WHERE id_cliente  = p_cliente_id)  THEN
    RAISE EXCEPTION 'Cliente % no existe', p_cliente_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empleado WHERE id_empleado = p_empleado_id) THEN
    RAISE EXCEPTION 'Empleado % no existe', p_empleado_id;
  END IF;

  -- Verificar stock y calcular total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_productos)
  LOOP
    v_producto_id := (v_item->>'producto_id')::INTEGER;
    v_cantidad    := (v_item->>'cantidad')::INTEGER;

    SELECT precio_unitario, stock
      INTO v_precio, v_stock_actual
      FROM producto
     WHERE id_producto = v_producto_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no existe', v_producto_id;
    END IF;

    IF v_stock_actual < v_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para producto % (disponible: %, solicitado: %)',
        v_producto_id, v_stock_actual, v_cantidad;
    END IF;

    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;

  -- Insertar cabecera de venta
  INSERT INTO venta (cliente_id, empleado_id, total)
  VALUES (p_cliente_id, p_empleado_id, v_total)
  RETURNING id_venta INTO p_venta_id;

  -- Insertar detalle y descontar stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_productos)
  LOOP
    v_producto_id := (v_item->>'producto_id')::INTEGER;
    v_cantidad    := (v_item->>'cantidad')::INTEGER;

    SELECT precio_unitario INTO v_precio
      FROM producto WHERE id_producto = v_producto_id;

    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
    VALUES (p_venta_id, v_producto_id, v_cantidad, v_precio);

    UPDATE producto
       SET stock      = stock - v_cantidad,
           updated_at = NOW()
     WHERE id_producto = v_producto_id;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- propaga la excepción para que el backend haga ROLLBACK
END;
$$;

-- SP 2: sp_registrar_compra
--   Registra una compra a proveedor e incrementa stock.
--   Parámetros IN:  p_proveedor_id, p_producto_id,
--                   p_cantidad, p_precio_unitario
--   Parámetro OUT:  p_compra_id
CREATE OR REPLACE PROCEDURE sp_registrar_compra(
  IN  p_proveedor_id      INTEGER,
  IN  p_producto_id       INTEGER,
  IN  p_cantidad          INTEGER,
  IN  p_precio_unitario   NUMERIC(10,2),
  OUT p_compra_id         INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM proveedor WHERE id_proveedor = p_proveedor_id) THEN
    RAISE EXCEPTION 'Proveedor % no existe', p_proveedor_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM producto  WHERE id_producto  = p_producto_id)  THEN
    RAISE EXCEPTION 'Producto % no existe', p_producto_id;
  END IF;
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0';
  END IF;
  IF p_precio_unitario <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  INSERT INTO compra (id_proveedor, id_producto, cantidad_compra, precio_mayor_unidad)
  VALUES (p_proveedor_id, p_producto_id, p_cantidad, p_precio_unitario)
  RETURNING id_compra INTO p_compra_id;

  UPDATE producto
     SET stock      = stock + p_cantidad,
         updated_at = NOW()
   WHERE id_producto = p_producto_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- SP 3: sp_crear_producto
--   Crea un nuevo producto validando que la categoría y el
--   proveedor existan.
--   Parámetro OUT: p_producto_id
CREATE OR REPLACE PROCEDURE sp_crear_producto(
  IN  p_nombre          VARCHAR(150),
  IN  p_descripcion     TEXT,
  IN  p_precio          NUMERIC(10,2),
  IN  p_stock           INTEGER,
  IN  p_categoria_id    INTEGER,
  IN  p_proveedor_id    INTEGER,
  OUT p_producto_id     INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categoria WHERE id_categoria = p_categoria_id) THEN
    RAISE EXCEPTION 'Categoría % no existe', p_categoria_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM proveedor WHERE id_proveedor = p_proveedor_id) THEN
    RAISE EXCEPTION 'Proveedor % no existe', p_proveedor_id;
  END IF;
  IF p_precio < 0 THEN
    RAISE EXCEPTION 'El precio no puede ser negativo';
  END IF;

  INSERT INTO producto (nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id)
  VALUES (p_nombre, p_descripcion, p_precio, p_stock, p_categoria_id, p_proveedor_id)
  RETURNING id_producto INTO p_producto_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- SP 4: sp_actualizar_stock
--   Ajusta el stock de un producto (puede ser ajuste manual
--   positivo o negativo). Lanza excepción si el stock
--   resultante sería negativo.
--   Parámetros IN:  p_producto_id, p_ajuste (puede ser negativo)
--   Parámetro OUT:  p_stock_nuevo

CREATE OR REPLACE PROCEDURE sp_actualizar_stock(
  IN  p_producto_id  INTEGER,
  IN  p_ajuste       INTEGER,
  OUT p_stock_nuevo  INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_actual INTEGER;
BEGIN
  SELECT stock INTO v_stock_actual
    FROM producto
   WHERE id_producto = p_producto_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto % no existe', p_producto_id;
  END IF;

  IF (v_stock_actual + p_ajuste) < 0 THEN
    RAISE EXCEPTION 'Ajuste inválido: el stock resultante sería negativo (actual: %, ajuste: %)',
      v_stock_actual, p_ajuste;
  END IF;

  UPDATE producto
     SET stock      = stock + p_ajuste,
         updated_at = NOW()
   WHERE id_producto = p_producto_id
   RETURNING stock INTO p_stock_nuevo;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- SP 5: sp_crear_cliente
--   Crea un cliente validando que el DPI no esté duplicado.
--   Parámetro OUT: p_cliente_id

CREATE OR REPLACE PROCEDURE sp_crear_cliente(
  IN  p_dpi       VARCHAR(150),
  IN  p_nombre    VARCHAR(150),
  IN  p_email     VARCHAR(150),
  IN  p_telefono  VARCHAR(20),
  IN  p_direccion TEXT,
  OUT p_cliente_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cliente WHERE DPI = p_dpi) THEN
    RAISE EXCEPTION 'Ya existe un cliente con DPI %', p_dpi;
  END IF;
  IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio';
  END IF;

  INSERT INTO cliente (DPI, nombre, email, telefono, direccion)
  VALUES (p_dpi, p_nombre, p_email, p_telefono, p_direccion)
  RETURNING id_cliente INTO p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- SP 6 (FUNCIÓN): sp_cancelar_venta
--   Cancela una venta y restaura el stock de los productos.
--   Incluye transacción con ROLLBACK explícito en excepción.
--   Parámetros IN:  p_venta_id
--   Retorna: TEXT con mensaje de resultado

CREATE OR REPLACE FUNCTION sp_cancelar_venta(p_venta_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_cancelada BOOLEAN;
  v_item      RECORD;
BEGIN
  -- Verificar que la venta existe y no está ya cancelada
  SELECT cancelada INTO v_cancelada
    FROM venta
   WHERE id_venta = p_venta_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta % no existe', p_venta_id;
  END IF;

  IF v_cancelada THEN
    RAISE EXCEPTION 'La venta % ya fue cancelada', p_venta_id;
  END IF;

  -- Restaurar stock por cada línea de detalle
  FOR v_item IN
    SELECT producto_id, cantidad
      FROM detalle_ventas
     WHERE venta_id = p_venta_id
  LOOP
    UPDATE producto
       SET stock      = stock + v_item.cantidad,
           updated_at = NOW()
     WHERE id_producto = v_item.producto_id;
  END LOOP;

  -- Marcar la venta como cancelada
  UPDATE venta
     SET cancelada = TRUE
   WHERE id_venta = p_venta_id;

  RETURN 'Venta ' || p_venta_id || ' cancelada. Stock restaurado.';

EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- el BEGIN/COMMIT en el backend hará ROLLBACK
END;
$$;

--  DATOS DE PRUEBA

INSERT INTO categoria (nombre, descripcion) VALUES
  ('Electrónica',       'Dispositivos y accesorios electrónicos'),
  ('Ropa',              'Prendas de vestir para toda la familia'),
  ('Alimentos',         'Productos alimenticios y bebidas'),
  ('Hogar',             'Artículos para el hogar y decoración'),
  ('Deportes',          'Equipamiento y ropa deportiva'),
  ('Herramientas',      'Herramientas manuales y eléctricas'),
  ('Papelería',         'Útiles escolares y de oficina'),
  ('Belleza y Cuidado', 'Cosméticos, higiene y cuidado personal');

INSERT INTO proveedor (nombre, contacto, telefono, email, ubicacion) VALUES
  ('Tech Supply S.A.',    'Carlos López',    '2222-1111', 'carlos@techsupply.com',   'Zona 9, Guatemala'),
  ('Moda Global S.R.L.',  'Ana Rodríguez',   '2333-2222', 'ana@modaglobal.com',      'Zona 10, Guatemala'),
  ('Distribuidora Norte', 'Pedro Martínez',  '2444-3333', 'pedro@distnorte.com',     'Quetzaltenango'),
  ('Herramex GT',         'Luis Fuentes',    '2555-4444', 'luis@herramex.com',       'Zona 12, Guatemala'),
  ('BeautyPro Guatemala', 'María Cifuentes', '2666-5555', 'maria@beautypro.gt',      'Zona 1, Guatemala'),
  ('Deportes Total',      'Jorge Morales',   '2777-6666', 'jorge@deportestotal.com', 'Mixco, Guatemala'),
  ('Papelería Nacional',  'Rosa Herrera',    '2888-7777', 'rosa@papnacional.com',    'Zona 4, Guatemala'),
  ('Alimentos del Campo', 'Sofía Ajú',       '2999-8888', 'sofia@alicampo.com',      'Escuintla');

INSERT INTO producto (nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id) VALUES
  ('Laptop 15" Core i5',     'Laptop 16GB RAM, SSD 512GB',      8500.00, 12, 1, 1),
  ('Mouse inalámbrico',      'Mouse ergonómico Bluetooth',        250.00, 60, 1, 1),
  ('Teclado mecánico',       'Teclado compacto TKL RGB',          350.00, 35, 1, 1),
  ('Monitor 24"',            'FHD IPS 75Hz',                     2800.00,  8, 1, 1),
  ('Auriculares BT',         'Cancelación de ruido activa',       950.00, 20, 1, 1),
  ('Camiseta básica',        'Algodón 100%, tallas XS-XXL',       120.00,100, 2, 2),
  ('Jeans slim',             'Corte slim, azul y negro',          380.00, 50, 2, 2),
  ('Vestido floral',         'Tela ligera, varios colores',       280.00, 40, 2, 2),
  ('Camisa formal',          'Manga larga, algodón',              220.00, 55, 2, 2),
  ('Sudadera con capucha',   'Fleece interior suave',             350.00, 45, 2, 2),
  ('Arroz blanco 1 kg',      'Grano largo, premium',               28.00,200, 3, 8),
  ('Aceite de oliva 500 ml', 'Extra virgen importado',             95.00,120, 3, 8),
  ('Café molido 250 g',      'Café de altura, tueste medio',       65.00, 90, 3, 8),
  ('Leche entera 1 L',       'Pasteurizada, larga vida',           18.00,150, 3, 8),
  ('Pasta italiana 500 g',   'Spaghetti #5',                       22.00,180, 3, 8),
  ('Silla de oficina',       'Ergonómica, ruedas, reclinable',  1200.00, 10, 4, 4),
  ('Lámpara de escritorio',  'LED táctil, 3 tonos',               320.00, 25, 4, 4),
  ('Almohada viscoelástica', 'Memory foam, funda lavable',        280.00, 30, 4, 2),
  ('Set de sábanas queen',   'Microfibra, 4 piezas',              450.00, 20, 4, 2),
  ('Tapete antideslizante',  '60×90 cm, lavable',                  85.00, 40, 4, 4),
  ('Pelota de fútbol #5',    'Cuero sintético, cosida a mano',    180.00, 30, 5, 6),
  ('Guantes de boxeo',       '12 oz, cuero PU',                   420.00, 15, 5, 6),
  ('Colchoneta yoga',        'TPE 6 mm, antideslizante',          220.00, 25, 5, 6),
  ('Botella de agua 1 L',    'Acero inoxidable, térmica',         185.00, 50, 5, 6),
  ('Taladro eléctrico',      '600W, velocidad variable',          950.00,  5, 6, 4),
  ('Set destornilladores',   '12 piezas, magnéticos',             160.00, 35, 6, 4),
  ('Cuaderno universitario', '200 hojas, pasta dura',              45.00,200, 7, 7),
  ('Bolígrafos x 10',        'Tinta negra, punto fino',            30.00,300, 7, 7),
  ('Crema hidratante 200ml', 'Piel seca, con vitamina E',         140.00, 60, 8, 5),
  ('Shampoo 400 ml',         'Nutrición intensa, sin sulfatos',    85.00, 80, 8, 5);

INSERT INTO cliente (DPI, nombre, email, telefono, direccion) VALUES
  ('1234567890101','Juan Pérez',        'juan@email.com',    '5555-0001','Zona 1, Guatemala'),
  ('2345678901201','María García',      'maria@email.com',   '5555-0002','Zona 10, Guatemala'),
  ('3456789012301','Luis Torres',       'luis@email.com',    '5555-0003','Zona 15, Guatemala'),
  ('4567890123401','Ana Martínez',      'ana@email.com',     '5555-0004','Mixco, Guatemala'),
  ('5678901234501','Carlos Gómez',      'carlos@email.com',  '5555-0005','Villa Nueva, Guatemala'),
  ('6789012345601','Sofía Herrera',     'sofia2@email.com',  '5555-0006','Zona 7, Guatemala'),
  ('7890123456701','Pedro Cifuentes',   'pedro@email.com',   '5555-0007','Antigua Guatemala'),
  ('8901234567801','Laura Fuentes',     'laura@email.com',   '5555-0008','Zona 14, Guatemala'),
  ('9012345678901','Diego López',       'diego@email.com',   '5555-0009','Quetzaltenango'),
  ('0123456789001','Valentina Ramos',   'valen@email.com',   '5555-0010','Zona 12, Guatemala'),
  ('1122334455101','Rodrigo Ajú',       'rodrigo@email.com', '5555-0011','Escuintla'),
  ('2233445566201','Camila Morales',    'camila@email.com',  '5555-0012','Zona 5, Guatemala'),
  ('3344556677301','Andrés Castro',     'andres@email.com',  '5555-0013','Chimaltenango'),
  ('4455667788401','Isabela Méndez',    'isabela@email.com', '5555-0014','Zona 9, Guatemala'),
  ('5566778899501','Tomás Ordóñez',     'tomas@email.com',   '5555-0015','San Marcos'),
  ('6677889900601','Natalia Díaz',      'natalia@email.com', '5555-0016','Zona 11, Guatemala'),
  ('7788990011701','Sebastián Lima',    'sebas@email.com',   '5555-0017','Petén'),
  ('8899001122801','Alejandra Vásquez', 'aleja@email.com',   '5555-0018','Zona 6, Guatemala'),
  ('9900112233901','Felipe Barrera',    'felipe@email.com',  '5555-0019','Cobán'),
  ('0011223344001','Daniela Pac',       'daniela@email.com', '5555-0020','Zona 13, Guatemala');

INSERT INTO empleado (nombre, cargo, email, telefono) VALUES
  ('Roberto Díaz',     'Vendedor',      'roberto@tienda.com',  '5500-0001'),
  ('Sofía Herrera',    'Vendedora',     'sofia@tienda.com',    '5500-0002'),
  ('Marcos Cifuentes', 'Supervisor',    'marcos@tienda.com',   '5500-0003'),
  ('Elena Ramos',      'Vendedora',     'elena@tienda.com',    '5500-0004'),
  ('David Morales',    'Bodeguero',     'david@tienda.com',    '5500-0005'),
  ('Patricia Lima',    'Cajera',        'patricia@tienda.com', '5500-0006'),
  ('Héctor Ajú',       'Vendedor',      'hector@tienda.com',   '5500-0007'),
  ('Carmen Pac',       'Administradora','carmen@tienda.com',   '5500-0008');

-- ── Usuarios de prueba — uno por cada rol ─────────────────────
-- Contraseña de todos: "Admin1234" (bcrypt rounds=10)
INSERT INTO usuario (nombre, correo, telefono, contrasena_hash, tipo_usuario) VALUES
  ('Admin Principal',    'admin@tienda.com',      '5500-9001',
   '$2a$10$Ph.nT3yCfM0rjbRQD09Ay.3aG46beTwu1M41pOR6wH4x6ADCZ0ZvK', 'admin'),
  ('Roberto Vendedor',   'vendedor@tienda.com',   '5500-9002',
   '$2a$10$Ph.nT3yCfM0rjbRQD09Ay.3aG46beTwu1M41pOR6wH4x6ADCZ0ZvK', 'vendedor'),
  ('David Bodega',       'bodega@tienda.com',     '5500-9003',
   '$2a$10$Ph.nT3yCfM0rjbRQD09Ay.3aG46beTwu1M41pOR6wH4x6ADCZ0ZvK', 'bodeguero'),
  ('Marcos Supervisor',  'supervisor@tienda.com', '5500-9004',
   '$2a$10$Ph.nT3yCfM0rjbRQD09Ay.3aG46beTwu1M41pOR6wH4x6ADCZ0ZvK', 'supervisor'),
  ('Ana Consulta',       'consulta@tienda.com',   '5500-9005',
   '$2a$10$Ph.nT3yCfM0rjbRQD09Ay.3aG46beTwu1M41pOR6wH4x6ADCZ0ZvK', 'consulta');

-- ── Ventas de prueba ──────────────────────────────────────────
INSERT INTO venta (cliente_id, empleado_id, fecha, total) VALUES
  (1,  1, NOW() - INTERVAL '30 days', 8750.00),
  (2,  2, NOW() - INTERVAL '29 days', 500.00),
  (3,  1, NOW() - INTERVAL '28 days', 1180.00),
  (4,  3, NOW() - INTERVAL '27 days', 250.00),
  (5,  2, NOW() - INTERVAL '26 days', 3430.00),
  (6,  4, NOW() - INTERVAL '25 days', 650.00),
  (7,  1, NOW() - INTERVAL '24 days', 9450.00),
  (8,  2, NOW() - INTERVAL '23 days', 280.00),
  (9,  3, NOW() - INTERVAL '22 days', 760.00),
  (10, 4, NOW() - INTERVAL '21 days', 420.00),
  (11, 1, NOW() - INTERVAL '20 days', 1150.00),
  (12, 2, NOW() - INTERVAL '19 days', 185.00),
  (13, 3, NOW() - INTERVAL '18 days', 560.00),
  (14, 4, NOW() - INTERVAL '17 days', 2800.00),
  (15, 1, NOW() - INTERVAL '16 days', 320.00),
  (16, 2, NOW() - INTERVAL '15 days', 450.00),
  (17, 3, NOW() - INTERVAL '14 days', 1900.00),
  (18, 4, NOW() - INTERVAL '13 days', 210.00),
  (19, 1, NOW() - INTERVAL '12 days', 750.00),
  (20, 2, NOW() - INTERVAL '11 days', 600.00);

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES
  (1,  1, 1, 8500.00),(1,  2, 1, 250.00),
  (2,  6, 2, 120.00),(2, 10, 1, 350.00),(2, 28, 2, 30.00),
  (3,  7, 1, 380.00),(3, 21, 1, 180.00),(3, 11, 5, 28.00),(3, 13, 3, 65.00),
  (4,  2, 1, 250.00),
  (5,  5, 1, 950.00),(5,  3, 1, 350.00),(5,  6, 4, 120.00),(5, 18, 1, 280.00),
  (6,  9, 2, 220.00),(6, 29, 1, 140.00),
  (7,  1, 1, 8500.00),(7, 25, 1, 950.00),
  (8,  8, 1, 280.00),
  (9, 22, 1, 420.00),(9, 23, 1, 220.00),(9, 14, 5, 18.00),
  (10,10, 1, 350.00),(10,28, 2, 30.00),(10,29, 1, 140.00),
  (11,17, 1, 320.00),(11,11, 3, 28.00),(11,12, 2, 95.00),(11,13, 2, 65.00),(11,15, 4, 22.00),
  (12,24, 1, 185.00),
  (13,26, 1, 160.00),(13,27, 5, 45.00),(13,28, 5, 30.00),
  (14, 4, 1,2800.00),
  (15,17, 1, 320.00),
  (16,19, 1, 450.00),
  (17, 5, 2, 950.00),
  (18,30, 1, 85.00),(18,29, 1, 140.00),
  (19,21, 2, 180.00),(19,23, 1, 220.00),(19,28, 3, 30.00),
  (20, 9, 2, 220.00),(20,30, 1, 85.00),(20,14, 5, 18.00);

INSERT INTO compra (id_proveedor, id_producto, cantidad_compra, precio_mayor_unidad, fecha) VALUES
  (1,  1,  5, 5200.00, NOW() - INTERVAL '60 days'),
  (1,  2, 50,  130.00, NOW() - INTERVAL '58 days'),
  (1,  3, 30,  180.00, NOW() - INTERVAL '55 days'),
  (1,  4,  8, 1600.00, NOW() - INTERVAL '50 days'),
  (1,  5, 20,  520.00, NOW() - INTERVAL '45 days'),
  (2,  6,100,   60.00, NOW() - INTERVAL '40 days'),
  (2,  7, 50,  190.00, NOW() - INTERVAL '38 days'),
  (2,  8, 40,  140.00, NOW() - INTERVAL '36 days'),
  (8, 11,200,   14.00, NOW() - INTERVAL '30 days'),
  (8, 12,120,   45.00, NOW() - INTERVAL '28 days'),
  (4, 16, 10,  650.00, NOW() - INTERVAL '20 days'),
  (6, 21, 30,   90.00, NOW() - INTERVAL '10 days'),
  (7, 27,200,   22.00, NOW() - INTERVAL '5 days'),
  (5, 29, 60,   70.00, NOW() - INTERVAL '4 days');
