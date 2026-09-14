# Validacion SEC-011 y SEC-013 (2026-09-14)

## SEC-011 - Endurecimiento CORS con credentials en production

Implementacion aplicada:
- Archivo: app/middlewares/security.js
- Regla fail-fast: si `isProduction=true`, `CORS_ALLOW_CREDENTIALS=true` y `ALLOWED_ORIGINS` contiene wildcard, se aborta inicializacion con error `[SECURITY_CONFIG]`.

Prueba ejecutada:
- `CORS_ALLOW_CREDENTIALS=true`
- `ALLOWED_ORIGINS='https://*.example.com,https://admin.example.com'`
- `registerSecurityMiddleware(app, { isProduction: true })`

Resultado:
- `SEC011_WILDCARD_CREDS: THREW_SECURITY_CONFIG`

Conclusion:
- Cumplido: credentials en production no permite wildcard en CORS.

## SEC-013 - Smoke OAuth + rutas criticas

Script ejecutado:
- `bash testing/securitySmokeOauthCriticalRoutes.sh`

Resultado:
- Summary: `PASS=18 FAIL=0`
- Exit: `SEC013_EXIT=0`

Cobertura validada:
1. Rutas criticas:
- `/` -> status 302
- `/login.html` -> status 200
- `/auth/user` -> status 401

2. Headers de seguridad presentes en rutas criticas:
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`

3. Politica CSP:
- `frame-ancestors 'none'` presente en rutas criticas.

4. OAuth smoke:
- `/auth/google` responde redirect `302`.
- `Location` de OAuth valida (Google).
- `Content-Security-Policy` presente en `/auth/google`.

## Resultado final
- SEC-011: Done.
- SEC-013: Done.
