# Guía de Integración OAuth2 Google en Magnumslocal

## Resumen
Este documento describe los pasos realizados para integrar autenticación OAuth2 con Google en el proyecto magnumslocal, igualando el flujo y estilos con magnumsmaster y asegurando consistencia visual y funcional.

## Pasos Realizados

### 1. Instalación de dependencias
- Se instalaron los paquetes necesarios:
  - `passport`
  - `passport-google-oauth20`
  - `express-session`

### 2. Configuración de variables de entorno
- Se añadieron las variables en `.env`:
  - `GOOGLE_CLIENT_ID` (ID de cliente real de Google)
  - `GOOGLE_CLIENT_SECRET` (Secreto real de Google)
  - `JWT_SECRET` (para sesiones)

### 3. Google Cloud Console
- Se creó un ID de cliente OAuth2 tipo "Aplicación web".
- Se configuraron los orígenes autorizados:
  - `http://localhost:6001`
  - `https://app.blockswine.com` (para producción)
- Se configuraron las URIs de redirección:
  - `http://localhost:6001/auth/google/callback`
  - `https://app.blockswine.com/auth/google/callback`
- Se añadieron usuarios de prueba en la pantalla de consentimiento.

### 4. Backend (server.js)
- Se integró Passport.js y express-session.
- Se definieron las rutas:
  - `/auth/google` (inicio OAuth)
  - `/auth/google/callback` (callback de Google)
  - `/auth/user` (devuelve el usuario autenticado)
- Se aseguraron los middlewares en el orden correcto tras inicializar `app`.

### 5. Frontend
- Se creó/actualizó `login.html` para igualar el estilo visual de `view.html` y `keystore.html`.
- Se incluyó el botón "Iniciar sesión con Google" y el formulario tradicional.
- Se importó `styles.css` para asegurar el fondo oscuro y estilos globales.

### 6. Restricciones de acceso
- En modo de prueba, solo los usuarios añadidos como "testers" pueden iniciar sesión con Google.
- Para acceso global, se debe publicar la app en Google Cloud y pasar la verificación.

## Próximos pasos
- Publicar la app en Google Cloud para permitir acceso a cualquier usuario de Google.
- Revisar la pantalla de consentimiento y permisos si se requiere acceso a datos sensibles.

---

**Última actualización:** 5 de febrero de 2026


1. El siguiente paso: Sincronizar OAuth con tu Wallet
Como ya tienes el login, necesitamos que el usuario de Google se asocie a una dirección de tu sistema wallet/index.js.

Prompt para Copilot:

"@copilot, activa las habilidades oauth-master y js-modules-pro. Ahora que ya recibo el perfil del usuario tras el login, necesito:

En el backend (app/index.js), crear una función que compruebe si este email de Google ya tiene una Wallet asociada en nuestro sistema de archivos.

Si es un usuario nuevo, genera una nueva instancia de Wallet (usando wallet/index.js) y guarda la relación email <-> publicKey de forma segura.

Devuelve al frontend no solo el nombre del usuario, sino también su Dirección de Blockchain."

2. Actualizar el Dashboard (view.html)
Ahora que el usuario está logueado, el botón de "Login" debe desaparecer y mostrar la información del usuario y su saldo de tokens/lotes.

Prompt para Copilot:

"@copilot, usa la skill js-architect para actualizar la UI. Una vez que el login es exitoso:

Oculta el componente AuthButton.

Muestra un nuevo componente UserProfileCard que presente el nombre del usuario, su foto de Google y un botón para copiar su dirección de Wallet.

Añade un botón de 'Logout' que limpie la sesión y recargue la página."

3. Seguridad Post-Login (JWT)
Para que las futuras acciones (como minar o crear un lote de vino) sean seguras, debes asegurarte de que el usuario envía su token en cada petición.

Consejo de la Skill oauth-master: Asegúrate de que Copilot configure las llamadas de fetchData.js para incluir el header de autorización:

JavaScript
headers: {
  'Authorization': `Bearer ${userToken}`
}
💡 Un reto para tu Blockchain:
¿Te gustaría que al loguearse, el sistema le regale automáticamente al usuario una pequeña cantidad de "gas" o tokens de cortesía para que pueda probar la trazabilidad de sus propios lotes?

es posible: puedes mostrar la imagen de perfil de Google (avatar) en el botón de login de view.html si el usuario ya está autenticado. Esto se hace así:

Cuando el usuario inicia sesión con Google, el backend (Passport.js) guarda el perfil, que incluye la URL de la foto.
El frontend (AuthComponent) puede consultar /auth/user y, si hay usuario autenticado, mostrar su imagen en vez del botón "Login".
Si no hay usuario autenticado, se muestra el botón normal.
No es complicado, solo hay que modificar el AuthComponent y el HTML para mostrar la imagen de perfil cuando esté disponible.


No sé si con las credenciales en .env es suficiente o esta es más comodo
Podríamos adaptar el controlador de Auth para que, tras el login de Google, verifique en Seenode si el usuario tiene permiso y, si es así, le "entregue" su Wallet para operar.