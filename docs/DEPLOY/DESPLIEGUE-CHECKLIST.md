# Checklist de Despliegue y Seguridad para Magnumsmaster

## Seguridad recomendada

1. **Protección de cabeceras HTTP**
   - Instala y usa `helmet` para proteger contra vulnerabilidades comunes.
   - Ejemplo: `npm install helmet` y `app.use(helmet());`

2. **Rate limiting**
   - Evita ataques de fuerza bruta y abuso con `express-rate-limit`.
   - Ejemplo: `npm install express-rate-limit` y configuración básica.

3. **Validación y sanitización de datos**
   - Usa `express-validator` para evitar inyecciones y XSS.
   - Valida y limpia todos los datos recibidos por endpoints.

4. **Autenticación y autorización**
   - Protege endpoints sensibles con JWT (`jsonwebtoken`) o `passport`.
   - Revisa que solo usuarios autorizados accedan a recursos críticos.

5. **CSRF protection**
   - Si tienes formularios POST desde el navegador, considera `csurf`.
   - Evita ataques de falsificación de petición en sitios cruzados.

6. **Actualiza dependencias**
   - Ejecuta `npm audit` y `npm update` para corregir vulnerabilidades conocidas.
   - Mantén las dependencias al día.

---

## Pasos para el despliegue

1. **Preparar entorno**
   - Verifica versión de Node.js y npm según `package.json`.
   - Configura variables de entorno (`.env.production`).

2. **Instalar dependencias**
   - Ejecuta `npm install`.
   - Revisa y actualiza dependencias críticas.

3. **Auditoría de seguridad**
   - Ejecuta `npm audit` y aplica `npm audit fix` si es necesario.

4. **Configurar seguridad**
   - Añade y configura `helmet`, `express-rate-limit`, validadores y autenticación.

5. **Pruebas**
   - Ejecuta los tests: `npm test`.
   - Verifica endpoints y funcionalidades clave.

6. **Build y optimización**
   - Si aplica, transpila/bundlea el código.
   - Elimina archivos innecesarios.

7. **Despliegue**
   - Sube el proyecto al servidor o plataforma (Seenode, Vercel, Heroku, etc).
   - Configura dominio y SSL.

8. **Monitorización y logs**
   - Activa logs y monitorización de errores.
   - Revisa el funcionamiento tras el despliegue.

---

## Lista rápida de verificación

- [ ] Node y npm en versión recomendada
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas y actualizadas
- [ ] Auditoría de seguridad pasada
- [ ] Middleware de seguridad activo
- [ ] Endpoints protegidos y validados
- [ ] Tests ejecutados y aprobados
- [ ] Despliegue realizado y verificado
- [ ] Monitorización activa

Básicos para MVP:

1 Variables de entorno configuradas (no claves en código).
2 Dependencias instaladas y actualizadas (npm install, npm audit).
Middleware de seguridad mínimo:
1 helmet para cabeceras.
2 cors bien configurado.
3 Validación de datos en endpoints (evitar inyecciones).
4 Endpoints protegidos si hay datos sensibles.
Tests básicos de funcionalidad.
Logs de errores y actividad.
Puedes dejar para después de validar el modelo:

Rate limiting avanzado (express-rate-limit).
Autenticación robusta (JWT, Passport).
Protección CSRF (csurf).
Monitorización avanzada y alertas.
Pruebas automatizadas completas.
Optimización de rendimiento y escalabilidad.
En resumen: prioriza seguridad básica, validación y control de errores. El resto puedes añadirlo tras validar el modelo y tener usuarios reales. ¿Quieres que te ayude a implementar alguno de los básicos?

Siguiente paso recomendado:

- Validar entrada con express-validator en endpoints críticos.
Limitar tamaño de payloads JSON.
Agregar rate limiting con express-rate-limit.
¿Quieres avanzar con la validación de entrada en /wallet/load-globa

La validación de entrada en /wallet/load-global significa verificar que los datos recibidos en la petición (body) cumplen con los requisitos esperados antes de procesarlos. Esto incluye:

Comprobar que todos los campos requeridos existen (por ejemplo: encryptedPrivateKey, salt, iv, tag, passphrase, publicKey).
Validar el formato y tipo de cada campo (por ejemplo: que publicKey sea una cadena, que salt no esté vacío, etc.).
Rechazar la petición si falta algún campo, si el formato es incorrecto, o si los datos no cumplen las reglas.
Esto ayuda a evitar errores, ataques y datos corruptos. Se suele implementar con la librería express-validator para definir reglas y devolver errores claros al usuario si la entrada no es válida.
¿Quieres que lo implemente en tu endpoint /wallet/load-global?

La siguiente mejora recomendada para tu MVP es:

- Limitar el tamaño de los payloads JSON que acepta tu backend. Esto previene ataques de denegación de servicio (DoS) y consumo excesivo de recursos por envíos de datos muy grandes.

Esto se implementa fácilmente configurando el middleware express.json() con un límite, por ejemplo:

El siguiente paso recomendado es:
- agregar rate limiting con express-rate-limit para limitar el número de peticiones por IP. 

Resumen:

En producción (Seenode): Tu frontend debe usar la URL del backend desplegado (no localhost).
En local: Tu frontend puede seguir usando localhost:3000, pero debes permitirlo en la política CSP de tu HTML.
La meta etiqueta CSP en view.html ha sido actualizada automáticamente. Ahora permite conexiones tanto a localhost:3000 como a cualquier subdominio de apps.run-on-seenode.com, cubriendo desarrollo y producción. No necesitas hacer nada más.