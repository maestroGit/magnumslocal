# Validacion SEC-010 y SEC-012 (2026-09-14)

## SEC-010 - Fail-fast de configuracion critica

Cambios aplicados:
- Archivo: app/middlewares/security.js
- Se agrego validacion de configuracion de seguridad al arranque (`validateSecurityConfiguration`).

Reglas fail-fast implementadas:
1. `ALLOWED_ORIGINS` obligatorio en production.
2. `ALLOWED_ORIGINS` no puede contener `*` en production.
3. Cada origen en `ALLOWED_ORIGINS` debe ser URL valida `http/https` (se permiten patrones wildcard de host).
4. `CSP_ALLOW_INLINE_STYLE_PROD` solo acepta `true` o `false` cuando se define.
5. La CSP generada debe contener directivas criticas: default-src, connect-src, script-src, style-src, base-uri, form-action, frame-ancestors, object-src.

Pruebas ejecutadas:
- Production con `ALLOWED_ORIGINS=''` -> lanza error con prefijo `[SECURITY_CONFIG]` (OK).
- Production con `ALLOWED_ORIGINS='https://app.example.com,https://admin.example.com'` -> no lanza (OK).

## SEC-012 - Test automatizado de headers y policy gates

Cambios aplicados:
1. Nuevo script:
- testing/securityHeadersGate.sh

2. Scripts npm añadidos:
- `test:security:headers`
- `test:security:headers:prod`

Cobertura del gate:
- Verifica headers por endpoint (`/`, `/login.html`, `/auth/user`):
  - Content-Security-Policy
  - X-Content-Type-Options
  - X-Frame-Options
- Verifica directivas CSP criticas:
  - default-src 'self'
  - script-src
  - style-src
  - base-uri 'self'
  - form-action 'self'
  - frame-ancestors 'none'
- En modo production (`SECURITY_TEST_MODE=production`): falla si aparece `unsafe-eval`.

Ejecucion validada:
- `bash testing/securityHeadersGate.sh`
- Resultado: PASS 27 / FAIL 0

## Resultado
- SEC-010: Done.
- SEC-012: Done.
