# Spec: Unificación de la Política de Seguridad (CSP) y Helmet en Express (#37)

## 0. Contexto y Directrices de Gobernanza
- **Cumplimiento normativo**: Este submódulo debe alinearse estrictamente con `docs/IA/standards.md` (Sección 2: Seguridad estricta y Sección 4.2: Helmet).
- **Propósito**: Centralizar y unificar la configuración de la Content Security Policy (CSP) y los headers de Helmet en un único módulo de seguridad, evitando fragmentación, configuraciones duplicadas o brechas de seguridad por omisión.

---

## 1. Objetivos y Alcance

### 1.1 Objetivos Principales
- Extraer la configuración de seguridad HTTP a un módulo centralizado (`src/middlewares/security.js` o equivalente).
- Configurar Helmet como capa base de hardening con todas las protecciones recomendadas habilitadas.
- Implementar una **CSP estricta** que proteja el nodo contra ataques XSS e inyección de datos sin romper los recursos legítimos del frontend ni los flujos de autenticación (Google OAuth).

### 1.2 Fuera de Alcance
- Lógica de negocio de las rutas o controladores de la aplicación.
- Modificación de la lógica de enrutamiento general (excepto la inyección del middleware global).

---

## 2. Especificación Técnica de Cabeceras y CSP

El middleware centralizado debe aplicar obligatoriamente las siguientes directivas y protecciones:

### 2.1 Configuración Base de Helmet
- Habilitar Helmet con la configuración por defecto para proteger contra secuestro de clics (`X-Frame-Options`), ataques MIME-sniffing (`X-Content-Type-Options`), y deshabilitar `X-Powered-By`.

### 2.2 Directivas de la Política CSP (Content-Security-Policy)
La política estricta por defecto debe ser:
- `default-src 'self'`
- `script-src 'self'` *(Prohibido el uso de `unsafe-inline` o `unsafe-eval` en producción)*
- `style-src 'self'` *(Estilos locales únicamente; cualquier excepción legacy debe documentarse)*
- `img-src 'self' data:` *(Permite imágenes locales y recursos en base64)*
- `connect-src 'self'` *(Ampliables solo a endpoints de API explícitamente autorizados si el nodo lo requiere)*
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`

---

## 3. Integración en el Servidor (`server.js`)

- El middleware de seguridad centralizado debe registrarse en el pipeline de Express **antes** de definir las rutas de la aplicación (`app.use(securityMiddleware)`).
- La política debe adaptarse de forma limpia según el entorno (`development` vs `production`) si existen diferencias controladas (por ejemplo, reportes de violación o flexibilidad temporal en dev), manteniendo la estrictez máxima en prod.

---

## 4. Casos Borde y Manejo de Excepciones

- **Compatibilidad con OAuth**: Asegurar que las redirecciones de Google OAuth 2.0 y los dominios de autenticación externos permitidos no queden bloqueados por las directivas `connect-src` o `form-action`.
- **Fallos de configuración**: Si falta alguna directiva crítica de seguridad al arrancar el servidor, el módulo debe rechazar la inicialización (*fail-fast*).

---

## 5. Criterios de Aceptación y Verificación

1. **Inspección de Headers**: Al realizar una petición HTTP (`curl -I http://localhost:3000`), la respuesta debe incluir obligatoriamente los headers:
   - `Content-Security-Policy` con la política estricta definida.
   - `X-Content-Type-Options: nosniff`.
   - `X-Frame-Options: SAMEORIGIN` o `DENY` según Helmet.
2. **Cero Rupturas (Frontend)**: Las páginas estáticas y scripts legítimos del nodo cargan correctamente en el navegador sin disparar errores bloqueantes de CSP en la consola.