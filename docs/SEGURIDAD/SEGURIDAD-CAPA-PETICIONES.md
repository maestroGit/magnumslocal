 La seguridad en una API REST no viene “de serie”: hay que implementarla con mecanismos adicionales y normalmente se apoyan en librerías o frameworks. Te detallo cómo se suele hacer en proyectos Node.js/Express (aunque aplica a otros entornos):

🔐 Autenticación fuerte
- Tokens JWT (JSON Web Token):
- Librerías: jsonwebtoken en Node.js.
- Flujo: el servidor genera un token firmado que el cliente debe incluir en cada petición (Authorization: Bearer <token>).
- Ventaja: escalable y estándar.
- API Keys:
- Librerías: middleware propio o paquetes como express-api-key.
- Flujo: cada cliente tiene una clave única que se valida en cada request.
- OAuth2 / OpenID Connect:
- Librerías: passport.js, oauth2-server.
- Flujo: autenticación delegada (Google, Microsoft, etc.), más robusta para ecosistemas grandes.

⚡ Rate limiting (limitar número de peticiones)
- Objetivo: evitar abusos (DDoS, brute force).
- Librerías:
- express-rate-limit → define cuántas peticiones por IP en un intervalo.
- rate-limiter-flexible → más avanzado, soporta Redis para entornos distribuidos.
- Ejemplo: máximo 100 requests por minuto por usuario/IP.

🔒 Cifrado (HTTPS)
- Objetivo: proteger datos en tránsito.
- Implementación:
- Usar certificados TLS (Let’s Encrypt, Cloudflare, etc.).
- En Node.js: https módulo nativo o servidores proxy como Nginx/Caddy delante de tu API.
- Nota: nunca exponer una API en producción sin HTTPS.


# Dilema entre “primero funcionalidad, luego seguridad” y “seguridad desde el diseño”. Te lo desgloso para que veas pros y contras:

🛠️ Opción 1: Desarrollar primero la blockchain y las APIs sin seguridad, añadirla después
Ventajas:
- Desarrollo más rápido y ligero en la fase inicial.
- Permite validar la lógica de consenso, transacciones y clientes sin fricciones.
- Ideal para prototipos o pruebas internas en entornos controlados.
Desventajas:
- Riesgo de que el código se diseñe sin contemplar seguridad → luego cuesta más “parchear”.
- Posibilidad de que se filtren endpoints inseguros si se despliega en pruebas públicas.
- Refactorización costosa: añadir autenticación, rate limiting y cifrado después puede implicar reescribir partes críticas.

🔒 Opción 2: Implementar seguridad en paralelo al desarrollo
Ventajas:
- La seguridad queda integrada en la arquitectura desde el inicio (“security by design”).
- Evita malas prácticas como exponer endpoints sin control.
- Reduce costes futuros de refactorización.
- Da confianza si compartes el proyecto con testers externos o comunidad.
Desventajas:
- Desarrollo inicial más lento.
- Puede complicar las pruebas si los testers necesitan tokens, claves o certificados.
- Requiere definir desde el principio políticas de acceso y gestión de credenciales
