## Cómo arrancar el backend en local

1. Abre una terminal en la carpeta raíz del proyecto.
2. Instala las dependencias si no lo has hecho:
	```bash
	npm install
	```
3. Exporta la variable de entorno para activar el modo desarrollo:
	```bash
	export NODE_ENV=development
	```
	> En Windows Bash, este comando funciona directamente. Si usas CMD o PowerShell, usa:
	```cmd
	set NODE_ENV=development
	```
4. Inicia el backend:
	```bash
	npm start
	```
5. Accede a la app en tu navegador en `http://localhost:3000` (o el puerto configurado).

> Si prefieres usar un archivo `.env`, crea uno en la raíz con:
> ```env
> NODE_ENV=development
> ```
> y asegúrate de que `dotenv` esté configurado al inicio de `server.js`.

---
## Configuración avanzada de CORS, Helmet y entorno para deploy local y Seenode

### 1. CORS temporal para pruebas (localhost y dominio)
Actualmente, el backend Express acepta peticiones tanto de `http://localhost` (cualquier puerto) como de `https://app.blockswine.com` en cualquier entorno (desarrollo o producción). Esto facilita pruebas locales y despliegues en Seenode o dominio propio sin cambiar la variable de entorno.

**Patrón actual en `server.js`:**
```js
const allowedPattern = /^(http:\/\/localhost(:\d+)?|https?:\/\/app\.blockswine\.com)$/;
```

> **Importante:** Cuando termines las pruebas, vuelve a restringir el patrón para producción, permitiendo solo tu dominio.

### 2. Helmet y Content Security Policy (CSP)
Se usa Helmet para proteger la app con cabeceras de seguridad, incluyendo una política CSP que también se adapta al entorno:
- En local, permite conexiones a la API local.
- En producción, solo permite conexiones a los endpoints de Seenode o tu dominio.

### 3. Orden correcto de middlewares
- Todos los imports van al inicio del archivo (requerido por ES Modules).
- Se carga `dotenv` antes de cualquier uso de `process.env`.
- El middleware para servir archivos estáticos (`express.static`) y el que fuerza el `Content-Type` para JS ESM se colocan antes de los endpoints y del manejador de errores global.
- El manejador de errores global va al final para capturar cualquier excepción.

### 4. Servir archivos JS ESM sin errores 500
Para evitar errores 500 al servir archivos JavaScript ESM, se añade un middleware que fuerza el header `Content-Type: application/javascript` en la ruta `/js`. Esto asegura que el navegador los interprete correctamente.

### 5. Flujo de deploy local y en Seenode
- **Local**: Antes de iniciar el backend, exporta la variable `NODE_ENV=development` para activar la configuración de desarrollo.
	```bash
	export NODE_ENV=development
	npm start
	```
- **Seenode**: El entorno de Seenode usa por defecto `NODE_ENV=production`, activando la configuración segura para subdominios y CSP restrictivo.

### 6. Recomendaciones
- Verifica siempre el valor de `NODE_ENV` antes de iniciar el backend.
- Si usas `.env`, asegúrate de que las variables estén correctamente definidas.
- Revisa los logs del backend para confirmar que los orígenes y cabeceras se aplican como esperas.

---
Esta configuración garantiza que el backend sea seguro y funcional tanto en desarrollo local como en producción en Seenode, evitando problemas de CORS, CSP y errores al servir archivos estáticos.


# app.blockswine

He revisado el commit 09516961d5ca9000c04f2c4dc005e7df98e56d4e. En ese commit, la configuración de CORS y CSP en server.js fue modificada para aceptar únicamente el dominio app.blockswine.com en producción, en vez de cualquier subdominio de Seenode.

Cambios clave:

Antes: Permitía cualquier subdominio de Seenode (*.apps.run-on-seenode.com).
Ahora: Solo permite app.blockswine.com en producción.
En desarrollo, sigue permitiendo localhost.
Esto explica por qué funcionaba tras ese deploy: el backend estaba correctamente configurado para tu dominio personalizado, y en desarrollo sigue aceptando localhost si la variable NODE_ENV no es "production".

Si quieres volver a aceptar subdominios de Seenode, deberías restaurar el patrón anterior en la expresión regular de CORS.