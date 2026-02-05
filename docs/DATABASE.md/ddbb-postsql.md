# ¿Qué gano con esta estructura?
modelo básico y extensible para PostgreSQL SQL — adaptado para tu stack y las necesidades de identidad, email (único con verificación) y KYC (Know Your Customer) que te preparará para regulaciones presentes y futuras.
- Compatible directamente con tus datos JSON. - Permite consultas, búsquedas y JOINs rápidos en SQL (vía usuario_id, categorías, etc).

Admite múltiples tipos de usuarios, wallets y relaciones.

# Tabla usuarios:
Representa tanto wine_lover como bodega.
Incluye todos los campos básicos, ubicación (localizacion_*), categorías (como array), y soporte para blockchain.
userCard mapeado como usercard_img y usercard_name.

# Tabla wallets:
Permite cero, uno o varios wallets por usuario (relación uno a muchos).
Referencia a usuario_id.
Campos según el JSON.

CREATE TABLE usuarios (
    id VARCHAR(32) PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    web VARCHAR(250),
    email VARCHAR(120) NOT NULL UNIQUE,            -- email único y obligatorio
    email_verified BOOLEAN DEFAULT FALSE,           -- verificación de email
    localizacion_direccion VARCHAR(250),
    localizacion_lat NUMERIC(10, 6),
    localizacion_lng NUMERIC(10, 6),
    categorias TEXT[],
    img_bottle VARCHAR(300),
    blockchain_active BOOLEAN,
    registrado BOOLEAN,
    fecha_registro TIMESTAMP,
    usercard_img VARCHAR(300),
    usercard_name VARCHAR(120),

    -- KYC fields básicos
    kyc_status VARCHAR(20) DEFAULT 'none',         -- pending/approved/rejected/none
    kyc_date TIMESTAMP,                            -- fecha último evento KYC
    kyc_doc_type VARCHAR(20),                      -- DNI/PASSPORT/etc
    kyc_doc_id VARCHAR(40),                        -- número doc
    kyc_doc_img VARCHAR(300)                       -- URL documento subido
);

CREATE TABLE wallets (
    id VARCHAR(32) PRIMARY KEY,
    address TEXT,
    status VARCHAR(24),                            -- active/inactive
    usuario_id VARCHAR(32) REFERENCES usuarios(id),
    fecha_vinculacion TIMESTAMP,
    type VARCHAR(32)
);

-- Opcional: tabla histórica/audit de eventos KYC
CREATE TABLE kyc_events (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(32) REFERENCES usuarios(id),
    evento VARCHAR(30),                            -- pending, review, approved, rejected, update
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    doc_type VARCHAR(20),
    doc_id VARCHAR(40),
    doc_img VARCHAR(300)
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_categorias ON usuarios USING GIN(categorias);
CREATE INDEX idx_wallet_usuario ON wallets(usuario_id);
CREATE INDEX idx_kyc_usuario ON kyc_events(usuario_id);

¿Cómo funciona esta estructura?
usuarios: todos los datos principales, email seguro/único, verificación y onboarding/funnel KYC.
kyc_status, kyc_date, etc. permiten saber el estado actual y documentar lo exigido para cumplimiento.
kyc_events: puedes guardar cada paso, revisión, cambio o rechazo en el proceso, para auditoría y reporting (opcional, pero muy útil en caso de inspección o validación externa).
wallets: completamente ligada al usuario, como antes, para blockchain y cruce de datos.


# ORM significa "Object Relational Mapping" (Mapeo Objeto-Relacional).

Es una herramienta/biblioteca que te permite interactuar con bases de datos SQL usando objetos y métodos en tu lenguaje de programación (por ejemplo, JavaScript en Node.js), en vez de escribir directamente las consultas SQL.
Traduce entre las tablas/campos SQL y las clases/objetos de tu app.
Ventajas:
Menos errores de sintaxis SQL.
Seguridad frente a inyección SQL (prepara las consultas).
Más fácil migrar estructura de la base.
Define modelos (clases) que representan tus tablas.
Permite hacer queries, inserts, updates y deletes usando funciones/objetos.
Los más usados en Node.js:
1. Sequelize
Muy popular en Node.js.
Soporta PostgreSQL, MySQL, MariaDB, SQLite y SQL Server.
Define los modelos como clases JS.
Permite relaciones, validaciones, migraciones.
2. TypeORM
Similar, pero con orientación fuerte a TypeScript (aunque funciona con JS).
Permite definir modelos con decoradores (más típico en TypeScript).
Soporta PostgreSQL, MySQL, SQLite y otros.
Potente para apps con mucho tipo y estructura.