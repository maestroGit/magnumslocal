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

---

## ✅ ESTADO DE IMPLEMENTACIÓN

**Fecha:** 10/02/2026 19:35  
**Versión:** 1.1.0  
**ORM Utilizado:** Sequelize 6.x

### Modelos Implementados

✅ **User** (`app/models/User.js`)
- Tabla: `usuarios`
- 20+ campos incluyendo KYC, subscription, gamificación
- Relación: `hasMany(Wallet, { as: 'wallets' })`

✅ **Wallet** (`app/models/Wallet.js`)
- Tabla: `wallets`
- Campo `usuario_id` con FOREIGN KEY a `usuarios(id)`
- Relación: `belongsTo(User, { as: 'user' })`

### API REST Funcional

**Base URL:** `http://localhost:6001`

| Endpoint | Método | Estado | Descripción |
|----------|--------|--------|-------------|
| `/users` | POST | ✅ Testeado | Crear usuario |
| `/users` | GET | ✅ Testeado | Listar con paginación y filtros |
| `/users/stats` | GET | ✅ Testeado | Estadísticas agregadas |
| `/users/:id` | GET | ⚠️ Requiere restart | Obtener usuario con wallets |
| `/users/:id` | PUT | 📋 Pendiente | Actualizar usuario |
| `/users/:id` | DELETE | 📋 Pendiente | Eliminar (soft/hard) |
| `/users/:id/wallets` | POST | 📋 Pendiente | Vincular wallet |
| `/users/:id/wallets` | GET | 📋 Pendiente | Listar wallets |
| `/users/:id/kyc` | PUT | 📋 Pendiente | Actualizar KYC |

### Pruebas Realizadas (10/02/2026)

**1. Estadísticas**
```bash
curl http://localhost:6001/users/stats
# ✅ Response: {"success":true,"data":{"total":2,"byRole":[...]}}
```

**2. Listado paginado**
```bash
curl "http://localhost:6001/users?limit=5"
# ✅ Response: 2 usuarios winery con paginación
```

**3. Crear usuario**
```bash
curl -X POST http://localhost:6001/users \
  -H "Content-Type: application/json" \
  -d '{"id":"test_user_1770752012","provider":"email",...}'
# ✅ Response: Usuario creado exitosamente
```

### Base de Datos Conectada

**Proveedor:** PostgreSQL en SeenodeRun  
**Host:** `up-de-fra1-postgresql-1.db.run-on-seenode.com:11550`  
**Database:** `db_ind9cmyyjvkz`  
**Usuarios actuales:** 3 (2 winery + 1 user de prueba)

### Correcciones Aplicadas

1. ✅ Campo `usuario_id` agregado a modelo Wallet
2. ✅ Import `sequelize` en userController para agregaciones
3. ✅ Alias 'wallets' y 'user' en relaciones para `include`

### Documentación Completa

📄 Ver: `docs/DATABASE/USER-MANAGEMENT-API.md`
- Esquema completo de tablas
- 9 endpoints documentados con ejemplos
- Validaciones y códigos de error
- Ejemplos curl para testing
- Índices y optimización

### Próximos Pasos

1. **Testing completo** de todos los endpoints (vincular wallet, actualizar KYC)
2. **Frontend integration** para registro y gestión de usuarios
3. **Migrations** con Sequelize para versionado de esquema
4. **Implementar tabla kyc_events** para auditoría

*
Usaremos Postman o un simple archivo HTML para enviarle al servidor un ID "inventado" que parezca de Google (ej: google-oauth2|test1234).

Así comprobamos que tu controlador guarda bien en Seenode y que la Wallet se vincula.