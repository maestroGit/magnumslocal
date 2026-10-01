# Forgot Password Flow (Implementado en magnumslocal y magnumsmaster)

> **Última revisión:** 1 de octubre de 2026  
> **Estado:** Implementado, validado y probado mediante Smoke Test SMTP contra Gmail.

Este documento describe el flujo de recuperación de contraseña implementado en la plataforma BlocksWine, cubriendo la configuración técnica, endpoints, seguridad OWASP, resolución de incidencias comunes y la **arquitectura definitiva recomendada** para la gestión de correo en una red de nodos P2P.

---

## 1. Quickstart (Configuración Rápida)

### 1.1 Variables de entorno requeridas (`.env` o `.env.production`)

```env
# 🔐 JWT Secret y TTL de Token
JWT_SECRET=tu_secreto_largo_y_aleatorio
RESET_TOKEN_TTL_MINUTES=15
APP_URL=https://app.blockswine.com

# 📧 Configuración SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=blockswine@gmail.com
SMTP_PASS=tu_app_password_16_caracteres_sin_espacios
SMTP_FROM=BlocksWine <blockswine@gmail.com>
```

> [!IMPORTANT]
> **Contraseña de Aplicación de Google (`SMTP_PASS`):**
> - Google no admite la contraseña personal de la cuenta. Debe generarse una contraseña de aplicación en [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requiere verificación en 2 pasos activa).
> - Google la muestra en 4 grupos de 4 letras (`xxxx xxxx xxxx xxxx`), pero **debe introducirse sin espacios** (16 letras continuas: `xxxxxxxxxxxxxxxx`).

### 1.2 Verificación de conectividad SMTP (Smoke Test)

Antes de probar la interfaz web, ejecuta el script de comprobación directa:

```bash
npm run test:smtp
# O directamente:
node testing/smtpSmokeTest.js
```

Si las credenciales son válidas, devolverá:
```text
[SMTP][BURN][DELIVERED]
[SMTP][SMOKE][OK]
```
y recibirás un correo de verificación en la bandeja de entrada.

### 1.3 Arrancar servidor y probar

1. Iniciar servidor:
   ```bash
   npm run start:local   # En entorno local
   # o
   npm run dev
   ```

2. Probar solicitud de recuperación vía API:
   ```bash
   curl -X POST http://localhost:6001/local/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"tu_correo@gmail.com"}'
   ```

3. Vía navegador:
   - Formulario de solicitud: `http://localhost:6001/forgot-password.html`
   - Formulario de reseteo: `http://localhost:6001/reset-password.html?token=TOKEN` (o ruta limpia `/reset-password?token=TOKEN`)

---

## 2. Resumen de la Implementación

El flujo de recuperación de contraseña cuenta con las siguientes características:

- **Modularidad:** Separado en rutas dedicadas (`app/routes/localAuth.js`) y controlador (`app/controllers/localAuthController.js`).
- **Seguridad stateless con JWT:** No requiere persistir tokens temporales en base de datos.
- **Protección anti-enumeración (OWASP):** La respuesta de `/local/forgot-password` siempre devuelve código HTTP 200 con mensaje genérico, impidiendo averiguar si un correo existe o no en la plataforma.
- **Validación robusta de contraseñas:** Mínimo 10 caracteres, mayúsculas, minúsculas, dígitos numéricos y caracteres especiales.
- **Hashing seguro:** Contraseñas almacenadas mediante `bcryptjs` con coste `saltRounds = 12`.
- **Plantilla de correo con fallback seguro:** Si no se define `APP_URL`, el sistema utiliza `APP_BASE_URL` o el dominio de producción `https://app.blockswine.com`.

---

## 3. Archivos del Sistema

### Backend
- [app/routes/localAuth.js](file:///c:/Users/maest/Documents/magnumslocal/app/routes/localAuth.js): Definición de rutas `/local/forgot-password` y `/local/reset-password`.
- [app/controllers/localAuthController.js](file:///c:/Users/maest/Documents/magnumslocal/app/controllers/localAuthController.js): Lógica de búsqueda de usuario, validaciones, generación de enlace y actualización de hash.
- [app/utils/generateResetToken.js](file:///c:/Users/maest/Documents/magnumslocal/app/utils/generateResetToken.js): Firma (`jwt.sign`) y verificación (`jwt.verify`) del token con `JWT_SECRET`.
- [app/utils/sendEmail.js](file:///c:/Users/maest/Documents/magnumslocal/app/utils/sendEmail.js): Transporte SMTP con `nodemailer` y trazabilidad `[SMTP][BURN]`.
- [testing/smtpSmokeTest.js](file:///c:/Users/maest/Documents/magnumslocal/testing/smtpSmokeTest.js): Test automatizado de envío directo sin interfaz gráfica.
- [server.js](file:///c:/Users/maest/Documents/magnumslocal/server.js): Registro de rutas `/local` y redirección a `public/reset-password.html`.

### Frontend
- [public/login.html](file:///c:/Users/maest/Documents/magnumslocal/public/login.html): Enlace "¿Olvidaste tu contraseña?".
- [public/forgot-password.html](file:///c:/Users/maest/Documents/magnumslocal/public/forgot-password.html): Formulario de ingreso de email.
- [public/reset-password.html](file:///c:/Users/maest/Documents/magnumslocal/public/reset-password.html): Formulario de establecimiento de nueva contraseña.
- [public/js/forgot-password.js](file:///c:/Users/maest/Documents/magnumslocal/public/js/forgot-password.js): Manejo de submit asíncrono y mensajes de confirmación.
- [public/js/reset-password.js](file:///c:/Users/maest/Documents/magnumslocal/public/js/reset-password.js): Lectura del token de la URL y validación de coincidencia de contraseña.

---

## 4. Detalle de Endpoints

### 4.1 POST `/local/forgot-password`

**Request:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Comportamiento interno:**
1. Valida formato de email.
2. Consulta el usuario en base de datos (`User.unscoped().findOne({ where: { email } })`).
3. Verifica que el usuario sea de tipo local/email y tenga `password_hash`.
4. Si cumple los requisitos:
   - Genera token JWT: `{ userId, typ: "pwd_reset" }` expirando en `RESET_TOKEN_TTL_MINUTES` (15 min).
   - Compone la URL: `${appUrl}/reset-password?token=${token}`.
   - Envía el correo mediante `sendEmail()`.
5. Si no existe o no es cuenta local, no emite error hacia el cliente para evitar enumeración.

**Response (siempre 200 OK):**
```json
{
  "message": "Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena."
}
```

---

### 4.2 POST `/local/reset-password`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "PasswordSegura#2026"
}
```

**Comportamiento interno:**
1. Valida presencia de parámetros.
2. Evalúa fortaleza de `newPassword` (mínimo 10 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo).
3. Verifica firma y vigencia del JWT con `JWT_SECRET`.
4. Comprueba que el claim `typ === "pwd_reset"` y extrae `userId`.
5. Obtiene el usuario y genera el nuevo hash con `bcrypt.hash(newPassword, 12)`.
6. Actualiza `user.password_hash` y guarda en PostgreSQL.

**Respuestas posibles:**
- `200 OK`: `{ "message": "Contrasena actualizada exitosamente. Ya puedes iniciar sesion." }`
- `400 Bad Request`: Token inválido, expirado o contraseña no cumple requisitos de complejidad.
- `500 Internal Server Error`: Error inesperado de base de datos.

---

## 5. Arquitectura Definitiva y Desacoplamiento SMTP en Red P2P

### 5.1 El Problema: Duplicidad de credenciales en nodos distribuidos

Actualmente, el código de la API web (`server.js`) está presente tanto en el **Relay central (Seenode / `app.blockswine.com`)** como en los **nodos secundarios (Railway, locales, Raspberry Pi)**. Ambos tipos de nodo se conectan a la misma base de datos PostgreSQL.

Si cada nodo secundario tuviera que enviar correos de recuperación de contraseña:
1. **Riesgo crítico de seguridad:** En una red P2P distribuida con 10, 20 o más nodos operados por terceros o colaboradores, **nunca se deben compartir las credenciales de email (`SMTP_PASS`) ni la clave de firma (`JWT_SECRET`)** en los archivos `.env` de nodos secundarios. Cualquiera con acceso físico o SSH a un nodo secundario podría extraer la contraseña de Gmail y usarla para spam o phishing.
2. **Límites y bloqueos de Google SMTP:** Gmail impone una cuota máxima de 500 envíos/día por cuenta. Si múltiples servidores con distintas direcciones IP realizan autenticaciones concurrentes con la misma cuenta, Google activa alertas de seguridad y bloqueos temporales por actividad sospechosa multi-IP.
3. **URL canónica de identidad:** El enlace de reseteo (`APP_URL`) siempre debe dirigir al dominio oficial de la plataforma (`https://app.blockswine.com`), no a subdominios efímeros de hosting ni a IPs de prueba locales.

---

### 5.2 Topología Recomendada: Hub de Identidad / Auth Gateway

```
[ Usuario en Navegador ]
         │
         ├─── (Navegación / Blockchain / Mempool) ───────► [ Nodo Secundario / P2P ]
         │                                                      │
         │                                                      ▼ (P2P Sockets)
         │                                               [ Relay Bootnode ]
         │                                                      ▲
         └─── (Autenticación / Forgot Password / SMTP) ─────────┘
              POST https://app.blockswine.com/local/forgot-password
```

1. **Relay Principal (Seenode / `app.blockswine.com`):**
   - Actúa como **Identity Provider (IdP)** canónico.
   - Es el **único nodo que almacena `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` y `JWT_SECRET`**.
   - Procesa los flujos de registro, login y restablecimiento de contraseña.

2. **Nodos Secundarios (`magnumslocal` en Railway, local, Raspberry Pi):**
   - **No almacenan variables SMTP.**
   - Su frontend (en `login.html` o `forgot-password.html`) envía las solicitudes de autenticación y reseteo directamente a la API del Relay:
     ```javascript
     // Redirección o petición a la URL canónica
     fetch('https://app.blockswine.com/local/forgot-password', { ... });
     ```
   - O alternativamente, el backend secundario actúa como un simple proxy inverso transparente hacia el Relay sin necesitar credenciales SMTP locales.
   - Los nodos secundarios quedan libres de credenciales sensibles y se dedican exclusivamente a su función nuclear: **validar bloques, gestionar la mempool P2P y servir consultas de la blockchain**.

---

### 5.3 Estado de Transición Actual (Fase de Pruebas)

Durante la fase de pruebas y testing de conectividad:
- Se permite mantener temporalmente variables SMTP en entornos propios y controlados (Seenode, Railway del desarrollador y local).
- Ambas instancias (`magnumsmaster` y `magnumslocal`) cuentan con validación Smoke Test operativa.
- Para el paso a producción abierta con múltiples validadores, se aplicará el desacoplamiento descrito en el punto 5.2.

---

## 6. Registro de Cambios y Revisiones

| Fecha | Autor / Entorno | Descripción del Cambio |
| :--- | :--- | :--- |
| **01/10/2026** | Antigravity IDE / Maestro | - Corrección de variables SMTP ausentes en `magnumsmaster`.<br>- Renovación de Google App Password sin espacios (`SMTP_PASS`).<br>- Validación exitosa de `smtpSmokeTest.js` en local y Seenode.<br>- Fallback automático en `buildResetUrl` a `APP_BASE_URL` / `https://app.blockswine.com`.<br>- Documentación de arquitectura desacoplada para red de nodos P2P. |
| **28/05/2026** | Equipo BlocksWine | Implementación inicial de endpoints `/local` y plantillas frontend. |
