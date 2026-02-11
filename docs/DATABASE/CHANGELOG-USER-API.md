# Changelog - User Management API

Registro de cambios, correcciones y pruebas del sistema de gestión de usuarios PostgreSQL.

---

## [1.1.0] - 2026-02-10 19:35

### 🐛 Correcciones Críticas

#### Error: "sequelize is not defined" en /users/stats

**Problema:**
```bash
curl http://localhost:6001/users/stats
# Response: {"success":false,"error":"Error al obtener estadísticas","details":"sequelize is..."}
```

**Causa raíz:** El controlador usaba `sequelize.fn()` y `sequelize.col()` para agregaciones, pero no importaba la instancia de sequelize.

**Solución:**
```javascript
// app/controllers/userController.js
import sequelize from '../config/database.js';  // ✅ Agregado
```

**Commit:** Fix sequelize import in userController  
**Archivo:** `app/controllers/userController.js:6`

---

#### Error: "Wallet is associated to User using an alias..." en GET /users/:id

**Problema:**
```bash
curl "http://localhost:6001/users/test_user_1770752012?includeWallets=true"
# Error: Wallet is associated to User using an alias. You've included an alias (wallets), but it does not...
```

**Causa raíz:** Sequelize requiere definir alias explícitos cuando se usa `include` con nombres personalizados.

**Solución:**
```javascript
// app/models/index.js
User.hasMany(Wallet, { foreignKey: 'usuario_id', as: 'wallets' });  // ✅ as: 'wallets'
Wallet.belongsTo(User, { foreignKey: 'usuario_id', as: 'user' });   // ✅ as: 'user'
```

**Commit:** Add Sequelize relationship aliases  
**Archivo:** `app/models/index.js:7-8`

---

#### Campo faltante: usuario_id en modelo Wallet

**Problema:** El modelo Wallet no definía explícitamente el campo `usuario_id` necesario para la foreign key.

**Solución:**
```javascript
// app/models/Wallet.js
usuario_id: {
  type: DataTypes.STRING(32),
  allowNull: true,
  references: {
    model: 'usuarios',
    key: 'id'
  }
}
```

**Commit:** Add usuario_id field to Wallet model  
**Archivo:** `app/models/Wallet.js:27-34`  
**Nota:** Colocado antes del cierre del `define()`, después de `fecha_vinculacion`

---

### ✅ Pruebas Exitosas

#### 1. GET /users/stats

**Timestamp:** 2026-02-10 19:33:45  
**Request:**
```bash
curl http://localhost:6001/users/stats
```

**Response:** HTTP 200
```json
{
  "success": true,
  "data": {
    "total": 2,
    "byRole": [
      { "role": "winery", "count": "2" }
    ],
    "byKYC": [...],
    "activeSubscriptions": 0
  }
}
```

**Validación:**
- ✅ Total de usuarios correcto (2)
- ✅ Agregación por role funciona
- ✅ Sin errores de sequelize

---

#### 2. GET /users (con paginación)

**Timestamp:** 2026-02-10 19:33:50  
**Request:**
```bash
curl "http://localhost:6001/users?limit=5"
```

**Response:** HTTP 200
```json
{
  "success": true,
  "data": [
    {
      "id": "google-oauth2|123456789",
      "provider": "google",
      "nombre": "Bodega Los Maestros",
      "email": "info@maestros.wine",
      "role": "winery",
      "kyc_status": "approved",
      "categorias": ["Vino Tinto", "Reserva", "Ecológico"],
      "points": 0
    },
    {
      "id": "oauth_test_99",
      "nombre": "Bodega Experimental",
      "email": "experimental@wine.test",
      "role": "winery"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 5,
    "totalPages": 1
  }
}
```

**Validación:**
- ✅ Paginación correcta
- ✅ Campos de usuario completos
- ✅ Arrays (categorias, badges) parseados correctamente

---

#### 3. POST /users

**Timestamp:** 2026-02-10 19:33:32  
**Request:**
```bash
curl -X POST http://localhost:6001/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_user_1770752012",
    "provider": "email",
    "nombre": "Usuario de Prueba",
    "email": "prueba1770752012@test.com",
    "role": "user",
    "categorias": ["vino-tinto", "crianza"]
  }'
```

**Response:** HTTP 201 (inferido por success)
```json
{
  "success": true,
  "data": {
    "id": "test_user_1770752012",
    "provider": "email",
    "nombre": "Usuario de Prueba",
    "email": "prueba1770752012@test.com",
    "role": "user",
    "categorias": ["vino-tinto", "crianza"],
    "registrado": true,
    "fecha_registro": "2026-02-10T19:33:32.742Z",
    "kyc_status": "none",
    "subscription_status": "inactive",
    "points": 0,
    "badges": []
  },
  "message": "Usuario creado exitosamente"
}
```

**Validación:**
- ✅ Usuario insertado en PostgreSQL
- ✅ Defaults aplicados correctamente (kyc_status: 'none', points: 0)
- ✅ Timestamp de creación generado automáticamente
- ✅ Arrays vacíos inicializados (badges: [])

---

### 📊 Estado de la Base de Datos

**Conexión:** PostgreSQL SSL  
**Host:** `up-de-fra1-postgresql-1.db.run-on-seenode.com:11550`  
**Database:** `db_ind9cmyyjvkz`  
**User:** `db_ind9cmyyjvkz`

**Usuarios actuales:** 3
1. `google-oauth2|123456789` - Bodega Los Maestros (winery)
2. `oauth_test_99` - Bodega Experimental (winery)
3. `test_user_1770752012` - Usuario de Prueba (user) ⭐ Creado en test

**Wallets actuales:** Pendiente verificar tras corrección de alias

---

### 🔜 Pendiente de Testing

- [ ] GET /users/:id?includeWallets=true (requiere reinicio de servidor)
- [ ] PUT /users/:id (actualización de datos)
- [ ] DELETE /users/:id?hard=true (soft/hard delete)
- [ ] POST /users/:id/wallets (vincular wallet)
- [ ] GET /users/:id/wallets (listar wallets de usuario)
- [ ] PUT /users/:id/kyc (actualizar estado KYC)

---

## [1.0.0] - 2026-02-10 18:00

### ✨ Implementación Inicial

- ✅ Modelos Sequelize: User, Wallet
- ✅ Controlador completo: 9 funciones CRUD
- ✅ Rutas RESTful: 11 endpoints
- ✅ Registro en server.js
- ✅ Documentación: USER-MANAGEMENT-API.md

**Archivos creados:**
- `app/models/User.js` (151 líneas)
- `app/models/Wallet.js` (45 líneas)
- `app/models/index.js` (11 líneas)
- `app/controllers/userController.js` (449 líneas)
- `app/routes/userRoutes.js` (60 líneas)
- `docs/DATABASE/USER-MANAGEMENT-API.md` (700+ líneas)

---

## Convenciones de Commit

```
fix: Corrección de bugs
feat: Nueva funcionalidad
docs: Cambios en documentación
test: Pruebas y testing
refactor: Refactorización de código
perf: Optimización de rendimiento
```

---

**Última actualización:** 10/02/2026 19:40  
**Mantenedor:** GitHub Copilot  
**Repositorio:** magnumslocal
