# Forgot Password Flow (Implementado en magnumslocal)

Este documento describe el flujo de recuperacion de contrasena ya implementado en el repositorio `magnumslocal`.

## Quickstart (2-3 minutos)

1. Configura variables en `.env`:

```env
JWT_SECRET=tu_secreto_jwt_largo
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@dominio.com
SMTP_PASS=tu_password_o_app_password
SMTP_FROM=BlocksWine <no-reply@blockswine.com>
APP_URL=https://miapp.com
RESET_TOKEN_TTL_MINUTES=15
```

2. Arranca el servidor:

```bash
npm run dev
```

3. Prueba solicitud de recuperacion:

```bash
curl -X POST http://localhost:6001/local/forgot-password \
	-H "Content-Type: application/json" \
	-d '{"email":"usuario@dominio.com"}'
```

4. Abre en navegador:

- `http://localhost:6001/forgot-password.html`
- `http://localhost:6001/reset-password.html?token=TOKEN`

5. Verifica login con nueva contrasena:

```bash
curl -X POST http://localhost:6001/auth/login \
	-H "Content-Type: application/json" \
	-d '{"username":"usuario@dominio.com","password":"NuevaPass!2026"}'
```

## Resumen

Se implemento un flujo completo y modular de recuperacion de contrasena con:

- Endpoints backend bajo prefijo `/local`
- Token temporal firmado con JWT (15 minutos por defecto)
- Hash de nueva contrasena con `bcryptjs`
- Envio de correo con `nodemailer`
- Pantallas frontend de solicitud y reseteo
- Enlace visible en login: `¿Olvidaste tu contrasena?`

## Archivos implementados

### Backend

- `app/routes/localAuth.js`
- `app/controllers/localAuthController.js`
- `app/utils/generateResetToken.js`
- `app/utils/sendEmail.js`
- `server.js` (registro de rutas + ruta limpia de reset)

### Frontend

- `public/login.html` (enlace a forgot password)
- `public/forgot-password.html`
- `public/reset-password.html`
- `public/js/forgot-password.js`
- `public/js/reset-password.js`

## Endpoints

### POST /local/forgot-password

Request:

```json
{
	"email": "usuario@dominio.com"
}
```

Comportamiento:

1. Recibe email.
2. Busca usuario por email (`User.unscoped().findOne`).
3. Si el usuario aplica para reset local/email y tiene password hash:
	 - Genera JWT con `userId` y `typ: "pwd_reset"`.
	 - Expiracion: 15 minutos (configurable).
	 - Envia email con enlace:
		 - `https://miapp.com/reset-password?token=TOKEN`
4. Devuelve siempre respuesta generica para evitar enumeracion de usuarios.

Response (siempre 200):

```json
{
	"message": "Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena."
}
```

### POST /local/reset-password

Request:

```json
{
	"token": "JWT_TOKEN",
	"newPassword": "NuevaPass!2026"
}
```

Comportamiento:

1. Valida `token` y `newPassword`.
2. Verifica fortaleza minima de contrasena:
	 - Minimo 10 caracteres
	 - 1 mayuscula
	 - 1 minuscula
	 - 1 numero
	 - 1 simbolo
3. Verifica JWT (`verify`) y expiracion.
4. Comprueba `typ === "pwd_reset"` y que tenga `userId`.
5. Busca usuario por `userId`.
6. Hashea nueva contrasena con `bcryptjs` (`saltRounds = 12`).
7. Guarda la nueva contrasena (`user.password_hash = ...; await user.save()`).
8. Si existe campo `password_updated_at`, lo actualiza para invalidacion adicional de tokens previos.

Responses:

- `200` cuando actualiza correctamente.
- `400` para token invalido/expirado o password debil.
- `500` para error interno.

## Seguridad aplicada (OWASP)

1. No revela si el email existe en forgot-password.
2. Token firmado en backend con `JWT_SECRET`.
3. Expiracion corta (15 min por defecto).
4. Password almacenada hasheada con bcrypt.
5. Validacion de fortaleza de contrasena.
6. No se almacena el token en base de datos (JWT stateless).
7. Se deja recomendacion explicita de rate limiting en forgot-password.

## Variables de entorno

Configurar en `.env`:

```env
JWT_SECRET=tu_secreto_jwt_largo
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@dominio.com
SMTP_PASS=tu_password_o_app_password
SMTP_FROM=BlocksWine <no-reply@blockswine.com>
APP_URL=https://miapp.com
RESET_TOKEN_TTL_MINUTES=15
```

## Integracion en server.js

Se registro el router local:

```js
app.use('/local', localAuthRoutes);
```

Y se expuso ruta limpia para frontend:

```js
app.get('/reset-password', (req, res) => {
	const resetPath = path.join(__dirname, 'public', 'reset-password.html');
	res.sendFile(resetPath);
});
```

## Frontend implementado

### Login

En `public/login.html` se agrego:

- Link visible y discreto: `¿Olvidaste tu contrasena?`
- Destino: `/forgot-password.html`

### Forgot Password

`public/forgot-password.html` + `public/js/forgot-password.js`:

1. El usuario introduce email.
2. Hace `POST /local/forgot-password`.
3. Muestra mensaje generico de confirmacion.

### Reset Password

`public/reset-password.html` + `public/js/reset-password.js`:

1. Lee `token` desde query string.
2. Pide nueva contrasena y confirmacion.
3. Hace `POST /local/reset-password`.
4. Muestra mensaje de exito o error.

## Ejemplo de email enviado

Asunto:

- `Recuperacion de contrasena - BlocksWine`

Cuerpo (texto):

```text
Hemos recibido una solicitud para restablecer tu contrasena.
Enlace (valido 15 minutos): https://miapp.com/reset-password?token=TOKEN
Si no solicitaste este cambio, ignora este correo.
```

## Ejemplo de validacion de token

```js
import { verifyResetToken } from '../app/utils/generateResetToken.js';

try {
	const payload = verifyResetToken(token);
	console.log(payload.userId, payload.exp);
} catch {
	console.log('Token invalido o expirado');
}
```

## Como probar con Postman

### 1) Solicitar recuperacion

- Metodo: `POST`
- URL: `http://localhost:6001/local/forgot-password`
- Body JSON:

```json
{
	"email": "usuario@dominio.com"
}
```

### 2) Resetear contrasena

- Metodo: `POST`
- URL: `http://localhost:6001/local/reset-password`
- Body JSON:

```json
{
	"token": "TOKEN_RECIBIDO",
	"newPassword": "NuevaPass!2026"
}
```

### 3) Verificar login

- Metodo: `POST`
- URL: `http://localhost:6001/auth/login`
- Body JSON:

```json
{
	"username": "usuario@dominio.com",
	"password": "NuevaPass!2026"
}
```

## Notas de mantenimiento

1. Si se rota `JWT_SECRET`, los tokens emitidos previamente dejan de ser validos.
2. Para produccion, activar rate limiting dedicado por endpoint `/local/forgot-password`.
3. Revisar deliverability SMTP (SPF/DKIM/DMARC) para mejorar llegada de correos.
