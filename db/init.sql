-- =============================================================
--  ESQUEMA COMPLETO — TIENDA
--  PostgreSQL 16
--  Usuario: proy2 | Contraseña: secret
-- =============================================================

-- ── Limpiar esquema previo ────────────────────────────────────
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

-- =============================================================
--  TABLAS
-- =============================================================

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
  total       NUMERIC(12,2) NOT NULL DEFAULT 0
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
  tipo_usuario     VARCHAR(20)  NOT NULL CHECK (tipo_usuario IN ('admin','vendedor','bodeguero'))
);

-- =============================================================
--  ÍNDICES
--  Justificación:
--  - idx_producto_categoria: producto.categoria_id aparece en JOINs de listado,
--    búsqueda por categoría y reportes de ventas por categoría.
--  - idx_venta_fecha: venta.fecha se filtra constantemente en reportes por
--    rango de fechas (semana, mes, año).
--  - idx_detalle_venta / idx_detalle_producto: columnas FK de la tabla más
--    consultada; aceleran JOINs al construir detalle de ventas.
--  - idx_compra_proveedor: permite filtrar historial de compras por proveedor.
-- =============================================================
CREATE INDEX idx_producto_categoria ON producto(categoria_id);
CREATE INDEX idx_venta_fecha        ON venta(fecha);
CREATE INDEX idx_detalle_venta      ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto   ON detalle_ventas(producto_id);
CREATE INDEX idx_compra_proveedor   ON compra(id_proveedor);

-- =============================================================
--  VISTAS
-- =============================================================

-- VIEW 1: detalle completo de cada línea de venta
CREATE VIEW v_ventas_detalle AS
SELECT
  v.id_venta,
  v.fecha,
  v.total,
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

-- VIEW 2: productos con stock crítico (≤ 5 unidades)
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

-- VIEW 3: resumen de ventas por empleado
CREATE VIEW v_resumen_ventas_empleado AS
SELECT
  e.id_empleado,
  e.nombre     AS empleado,
  e.cargo,
  COUNT(v.id_venta)          AS total_ventas,
  COALESCE(SUM(v.total), 0)  AS monto_total
FROM empleado e
LEFT JOIN venta v ON v.empleado_id = e.id_empleado
GROUP BY e.id_empleado, e.nombre, e.cargo;

-- =============================================================
--  DATOS DE PRUEBA
-- =============================================================

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
  ('Tech Supply S.A.',      'Carlos López',     '2222-1111', 'carlos@techsupply.com',   'Zona 9, Guatemala'),
  ('Moda Global S.R.L.',    'Ana Rodríguez',    '2333-2222', 'ana@modaglobal.com',      'Zona 10, Guatemala'),
  ('Distribuidora Norte',   'Pedro Martínez',   '2444-3333', 'pedro@distnorte.com',     'Quetzaltenango'),
  ('Herramex GT',           'Luis Fuentes',     '2555-4444', 'luis@herramex.com',       'Zona 12, Guatemala'),
  ('BeautyPro Guatemala',   'María Cifuentes',  '2666-5555', 'maria@beautypro.gt',      'Zona 1, Guatemala'),
  ('Deportes Total',        'Jorge Morales',    '2777-6666', 'jorge@deportestotal.com', 'Mixco, Guatemala'),
  ('Papelería Nacional',    'Rosa Herrera',     '2888-7777', 'rosa@papnacional.com',    'Zona 4, Guatemala'),
  ('Alimentos del Campo',   'Sofía Ajú',        '2999-8888', 'sofia@alicampo.com',      'Escuintla');

INSERT INTO producto (nombre, descripcion, precio_unitario, stock, categoria_id, proveedor_id) VALUES
  ('Laptop 15" Core i5',     'Laptop 16GB RAM, SSD 512GB',          8500.00, 12, 1, 1),
  ('Mouse inalámbrico',      'Mouse ergonómico Bluetooth',            250.00, 60, 1, 1),
  ('Teclado mecánico',       'Teclado compacto TKL RGB',              350.00, 35, 1, 1),
  ('Monitor 24"',            'FHD IPS 75Hz',                         2800.00,  8, 1, 1),
  ('Auriculares BT',         'Cancelación de ruido activa',           950.00, 20, 1, 1),
  ('Camiseta básica',        'Algodón 100%, tallas XS-XXL',           120.00,100, 2, 2),
  ('Jeans slim',             'Corte slim, azul y negro',              380.00, 50, 2, 2),
  ('Vestido floral',         'Tela ligera, varios colores',           280.00, 40, 2, 2),
  ('Camisa formal',          'Manga larga, algodón',                  220.00, 55, 2, 2),
  ('Sudadera con capucha',   'Fleece interior suave',                 350.00, 45, 2, 2),
  ('Arroz blanco 1 kg',      'Grano largo, premium',                   28.00,200, 3, 8),
  ('Aceite de oliva 500 ml', 'Extra virgen importado',                 95.00,120, 3, 8),
  ('Café molido 250 g',      'Café de altura, tueste medio',           65.00, 90, 3, 8),
  ('Leche entera 1 L',       'Pasteurizada, larga vida',               18.00,150, 3, 8),
  ('Pasta italiana 500 g',   'Spaghetti #5',                           22.00,180, 3, 8),
  ('Silla de oficina',       'Ergonómica, ruedas, reclinable',       1200.00, 10, 4, 4),
  ('Lámpara de escritorio',  'LED táctil, 3 tonos',                   320.00, 25, 4, 4),
  ('Almohada viscoelástica', 'Memory foam, funda lavable',            280.00, 30, 4, 2),
  ('Set de sábanas queen',   'Microfibra, 4 piezas',                  450.00, 20, 4, 2),
  ('Tapete antideslizante',  '60×90 cm, lavable',                      85.00, 40, 4, 4),
  ('Pelota de fútbol #5',    'Cuero sintético, cosida a mano',         180.00, 30, 5, 6),
  ('Guantes de boxeo',       '12 oz, cuero PU',                        420.00, 15, 5, 6),
  ('Colchoneta yoga',        'TPE 6 mm, antideslizante',               220.00, 25, 5, 6),
  ('Botella de agua 1 L',    'Acero inoxidable, térmica',              185.00, 50, 5, 6),
  ('Taladro eléctrico',      '600W, velocidad variable',               950.00,  5, 6, 4),
  ('Set destornilladores',   '12 piezas, magnéticos',                  160.00, 35, 6, 4),
  ('Cuaderno universitario', '200 hojas, pasta dura',                   45.00,200, 7, 7),
  ('Bolígrafos x 10',        'Tinta negra, punto fino',                 30.00,300, 7, 7),
  ('Crema hidratante 200 ml','Piel seca, con vitamina E',              140.00, 60, 8, 5),
  ('Shampoo 400 ml',         'Nutrición intensa, sin sulfatos',         85.00, 80, 8, 5);

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
  ('0011223344001','Daniela Pac',       'daniela@email.com', '5555-0020','Zona 13, Guatemala'),
  ('1123456789101','Emilio Coyoy',      'emilio@email.com',  '5555-0021','Totonicapán'),
  ('2234567890201','Paula Cux',         'paula@email.com',   '5555-0022','Zona 3, Guatemala'),
  ('3345678901301','Marcos Ixchop',     'marcos@email.com',  '5555-0023','Jalapa'),
  ('4456789012401','Renata Alvarado',   'renata@email.com',  '5555-0024','Zona 18, Guatemala'),
  ('5567890123501','Gustavo Xec',       'gustavo@email.com', '5555-0025','Huehuetenango'),
  ('6678901234601','Lidia Ajpop',       'lidia@email.com',   '5555-0026','Zona 2, Guatemala');

INSERT INTO empleado (nombre, cargo, email, telefono) VALUES
  ('Roberto Díaz',      'Vendedor',      'roberto@tienda.com',  '5500-0001'),
  ('Sofía Herrera',     'Vendedora',     'sofia@tienda.com',    '5500-0002'),
  ('Marcos Cifuentes',  'Supervisor',    'marcos@tienda.com',   '5500-0003'),
  ('Elena Ramos',       'Vendedora',     'elena@tienda.com',    '5500-0004'),
  ('David Morales',     'Bodeguero',     'david@tienda.com',    '5500-0005'),
  ('Patricia Lima',     'Cajera',        'patricia@tienda.com', '5500-0006'),
  ('Héctor Ajú',        'Vendedor',      'hector@tienda.com',   '5500-0007'),
  ('Carmen Pac',        'Administradora','carmen@tienda.com',   '5500-0008');

-- Contraseñas: "Admin1234" hasheada con bcrypt rounds=10
INSERT INTO usuario (nombre, correo, telefono, contrasena_hash, tipo_usuario) VALUES
  ('Admin Principal',  'admin@tienda.com',    '5500-9001',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y', 'admin'),
  ('Roberto Vendedor', 'vendedor@tienda.com', '5500-9002',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y', 'vendedor'),
  ('David Bodega',     'bodega@tienda.com',   '5500-9003',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y', 'bodeguero');

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
  (20, 2, NOW() - INTERVAL '11 days', 600.00),
  (21, 3, NOW() - INTERVAL '10 days', 1400.00),
  (22, 4, NOW() - INTERVAL '9 days',  380.00),
  (23, 1, NOW() - INTERVAL '8 days',  480.00),
  (24, 2, NOW() - INTERVAL '7 days',  1200.00),
  (25, 3, NOW() - INTERVAL '6 days',  350.00),
  (26, 4, NOW() - INTERVAL '5 days',  270.00),
  (1,  1, NOW() - INTERVAL '4 days',  8500.00),
  (2,  2, NOW() - INTERVAL '3 days',  860.00);

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
  (20, 9, 2, 220.00),(20,30, 1, 85.00),(20,14, 5, 18.00),
  (21, 7, 2, 380.00),(21, 6, 2, 120.00),(21,12, 2, 95.00),
  (22, 8, 1, 280.00),(22,28, 5, 30.00),
  (23,20, 1, 85.00),(23,27, 3, 45.00),(23,29, 1, 140.00),(23,30, 1, 85.00),
  (24,16, 1,1200.00),
  (25,11, 5, 28.00),(25,13, 2, 65.00),
  (26,28, 3, 30.00),(26,27, 2, 45.00),(26,30, 1, 85.00),
  (27, 1, 1,8500.00),
  (28, 4, 1,2800.00),(28, 2, 1, 250.00),(28,28, 3, 30.00);

INSERT INTO compra (id_proveedor, id_producto, cantidad_compra, precio_mayor_unidad, fecha) VALUES
  (1,  1,  5, 5200.00, NOW() - INTERVAL '60 days'),
  (1,  2, 50,  130.00, NOW() - INTERVAL '58 days'),
  (1,  3, 30,  180.00, NOW() - INTERVAL '55 days'),
  (1,  4,  8, 1600.00, NOW() - INTERVAL '50 days'),
  (1,  5, 20,  520.00, NOW() - INTERVAL '45 days'),
  (2,  6,100,   60.00, NOW() - INTERVAL '40 days'),
  (2,  7, 50,  190.00, NOW() - INTERVAL '38 days'),
  (2,  8, 40,  140.00, NOW() - INTERVAL '36 days'),
  (2,  9, 55,  110.00, NOW() - INTERVAL '34 days'),
  (2, 10, 45,  180.00, NOW() - INTERVAL '32 days'),
  (8, 11,200,   14.00, NOW() - INTERVAL '30 days'),
  (8, 12,120,   45.00, NOW() - INTERVAL '28 days'),
  (8, 13, 90,   30.00, NOW() - INTERVAL '26 days'),
  (8, 14,150,    9.00, NOW() - INTERVAL '24 days'),
  (8, 15,180,   10.00, NOW() - INTERVAL '22 days'),
  (4, 16, 10,  650.00, NOW() - INTERVAL '20 days'),
  (4, 17, 25,  160.00, NOW() - INTERVAL '18 days'),
  (2, 18, 30,  140.00, NOW() - INTERVAL '16 days'),
  (2, 19, 20,  225.00, NOW() - INTERVAL '14 days'),
  (4, 20, 40,   42.00, NOW() - INTERVAL '12 days'),
  (6, 21, 30,   90.00, NOW() - INTERVAL '10 days'),
  (6, 22, 15,  210.00, NOW() - INTERVAL '9 days'),
  (6, 23, 25,  110.00, NOW() - INTERVAL '8 days'),
  (6, 24, 50,   92.00, NOW() - INTERVAL '7 days'),
  (4, 25,  5,  475.00, NOW() - INTERVAL '6 days'),
  (7, 27,200,   22.00, NOW() - INTERVAL '5 days'),
  (5, 29, 60,   70.00, NOW() - INTERVAL '4 days');
