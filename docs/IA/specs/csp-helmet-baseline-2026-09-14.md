# Baseline CSP/Helmet - 2026-09-14

## Contexto
Validacion de cabeceras de seguridad con la aplicacion levantada manualmente por el usuario.

## Resultado de disponibilidad
- Puerto activo detectado: 6001
- Puerto 3000: sin respuesta en prueba inicial

## Endpoints validados
- /
- /login.html
- /auth/user

Se validaron metodos HEAD y GET.

## Cabeceras observadas
- Content-Security-Policy: presente
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Access-Control-Allow-Origin: no presente
- Access-Control-Allow-Credentials: no presente

## CSP observada (resumen)
default-src 'self'; connect-src 'self' http://localhost:3000 http://localhost:6001 ws://localhost:6001 wss: https://accounts.google.com https://www.googleapis.com https://*.googleusercontent.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 http://localhost:6001; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http://localhost:3000 http://localhost:6001 https://developers.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src-attr 'none'; upgrade-insecure-requests

## Hallazgos
1. La CSP incluye unsafe-inline y unsafe-eval en script-src.
2. La directiva frame-ancestors esta en self y no en none.
3. No se observaron diferencias de politica CSP entre los 3 endpoints.
4. Headers basicos de Helmet estan presentes (nosniff y x-frame-options).

## Reproduccion minima
curl -sS -D - -o /dev/null -I http://localhost:6001/
curl -sS -D - -o /dev/null -X GET http://localhost:6001/
curl -sS -D - -o /dev/null -X GET http://localhost:6001/login.html
curl -sS -D - -o /dev/null -X GET http://localhost:6001/auth/user

## Impacto sobre plan
- SEC-001: baseline completado con evidencia.
- SEC-003: puede continuar extraccion a middleware central.
- SEC-005/SEC-007/SEC-008: requieren endurecimiento para cumplir spec estricta.
