# Fase 2: Reset de Password (magnumslocal)

## Objetivo
Implementar un flujo seguro de recuperación de contraseña para cuentas locales (`provider=local` o `provider=email`) sin afectar cuentas OAuth (`google`, `github`, `facebook`).

## Alcance
- Backend completo del reset.
- Endpoints para solicitar y confirmar reset.
- Token de un solo uso con expiración.
- Reglas de seguridad mínimas (rate limit, no filtrado de existencia de email, logs de auditoría).
- Pruebas por `curl`.

## Fuera de alcance (esta fase)
- UI final completa (pantallas definitivas).
- Proveedor de email productivo (se puede usar stub/log inicialmente).

## Regla de negocio
1. `provider` social (`google`, `github`, `facebook`): no usar password local.
2. `provider` local/email: sí usar password y permitir reset.
3. Si el usuario social intenta login local: responder con `OAUTH_ACCOUNT_NO_PASSWORD`.

## Diseño técnico

### 1. Nueva tabla: `password_reset_tokens`
Campos sugeridos:
- `id` (uuid o serial PK)
- `user_id` (FK a `usuarios.id`)
- `token_hash` (string 128)
- `expires_at` (timestamp)
- `used_at` (timestamp nullable)
- `created_at` (timestamp)
- `request_ip` (string nullable)
- `user_agent` (string nullable)

Índices recomendados:
- `idx_password_reset_user_id`
- `idx_password_reset_expires_at`
- `idx_password_reset_used_at`

### 2. Endpoint: Solicitud de reset
`POST /auth/password-reset/request`

Body:
```json
{ "email": "user@example.com" }
```

Comportamiento:
1. Responder siempre `200` con mensaje genérico (evita enumeración de usuarios).
2. Si usuario existe y es local/email:
- Invalidar tokens activos previos del usuario (opcional pero recomendado).
- Generar token aleatorio seguro (32 bytes).
- Guardar solo `token_hash` (SHA-256) en BD.
- TTL recomendado: 15-30 minutos.
- Enviar email con enlace: `/reset-password.html?token=<token_plano>`.
3. Si usuario no existe u OAuth:
- Mantener la misma respuesta `200`.
- Registrar evento de auditoría.

Respuesta sugerida:
```json
{ "success": true, "message": "Si la cuenta existe, recibirás instrucciones por email." }
```

### 3. Endpoint: Confirmar reset
`POST /auth/password-reset/confirm`

Body:
```json
{ "token": "TOKEN_PLANO", "newPassword": "NuevaPassword#2026" }
```

Comportamiento:
1. Validar formato mínimo de password.
2. Hashear token recibido y buscar registro no usado y no expirado.
3. Si token válido:
- Hash de password con bcrypt (cost 10-12).
- Actualizar `usuarios.password_hash`.
- Marcar token como usado (`used_at=NOW()`).
- Invalidar otros tokens activos del usuario (opcional recomendado).
4. Si token inválido/expirado/usado: devolver `400`.

Respuesta éxito sugerida:
```json
{ "success": true, "message": "Contraseña actualizada correctamente." }
```

### 4. Seguridad mínima
1. Rate limit por IP en `/auth/password-reset/request`.
2. Rate limit por email (ventana corta).
3. No guardar tokens en texto plano.
4. TTL corto (15-30 min).
5. Un solo uso por token.
6. Logs sin datos sensibles.
7. Política de password (mínimo 8-10 chars + mezcla de tipos).

### 5. Integración en rutas
Actualizar `app/routes/authRoutes.js`:
- Añadir `postPasswordResetRequest`
- Añadir `postPasswordResetConfirm`

Rutas:
```js
router.post('/auth/password-reset/request', postPasswordResetRequest);
router.post('/auth/password-reset/confirm', postPasswordResetConfirm);
```

### 6. Integración en controlador
Actualizar `app/controllers/authController.js` o crear `passwordResetController.js`:
- `postPasswordResetRequest(req, res)`
- `postPasswordResetConfirm(req, res)`

### 7. Integración en modelo
Crear modelo Sequelize para `password_reset_tokens` (si aplica en arquitectura actual):
- `app/models/PasswordResetToken.js`
- Registrar en `app/models/index.js`

## Migración SQL sugerida
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  request_ip VARCHAR(64) NULL,
  user_agent VARCHAR(300) NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_used_at
  ON password_reset_tokens(used_at);
```

## Pruebas por curl

### 1) Request reset (siempre 200)
```bash
curl -i -X POST http://localhost:6001/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@correo.com"}'
```

### 2) Confirm reset
```bash
curl -i -X POST http://localhost:6001/auth/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_RECIBIDO","newPassword":"NuevaPassword#2026"}'
```

### 3) Login con nueva password
```bash
curl -i -X POST http://localhost:6001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario@correo.com","password":"NuevaPassword#2026"}'
```

## Criterios de aceptación
1. Usuarios locales pueden recuperar password con token válido.
2. Token expira y no se puede reutilizar.
3. Usuarios OAuth no reciben password local automáticamente.
4. El endpoint de request no revela si el email existe.
5. Login local funciona tras reset exitoso.

## Plan de implementación recomendado
1. Crear migración y tabla.
2. Crear modelo `PasswordResetToken`.
3. Implementar controller request/confirm.
4. Registrar rutas en `authRoutes.js`.
5. Añadir rate limit básico.
6. Probar con curl en local.
7. Desplegar a staging/producción.

## Riesgos y mitigaciones
1. Enumeración de usuarios:
- Mitigación: respuesta genérica constante en request.
2. Reuso de token:
- Mitigación: `used_at` + invalidación de previos.
3. Fuerza bruta en request:
- Mitigación: rate limit por IP/email.
4. Fuga de token:
- Mitigación: hash en BD + TTL corto.

## Notas de compatibilidad
- Mantener intacto el flujo OAuth actual.
- No forzar `password_hash` en cuentas sociales.
- En frontend, cuando llegue `OAUTH_ACCOUNT_NO_PASSWORD`, mostrar CTA al login social.
