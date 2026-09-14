# Validacion SEC-004 y SEC-005 - 2026-09-14

## Alcance
Verificacion posterior a cambios en:
- server.js
- app/middlewares/security.js

## Cambios aplicados
1. SEC-004: desactivar X-Powered-By en bootstrap de Express.
2. SEC-005: explicitar directivas CSP criticas en middleware central:
   - base-uri 'self'
   - form-action 'self'
   - frame-ancestors 'none'

## Verificacion runtime (http://localhost:6001/)
- X-Powered-By: ausente
- Content-Security-Policy: presente
- base-uri: presente con valor 'self'
- form-action: presente con valor 'self'
- frame-ancestors: observado 'self' (no 'none')

## Resultado
- SEC-004: OK (header X-Powered-By ausente)
- SEC-005: cerrado tras validacion final en runtime

## Nota tecnica
La discrepancia inicial de frame-ancestors se debio a proceso Node previo en puerto 6001 sin recarga efectiva. Tras cierre del listener antiguo y arranque limpio, la cabecera quedo correcta.

## Validacion final tras arranque limpio
Cabecera reportada por el usuario en `curl -sS -I http://localhost:6001/`:

Content-Security-Policy: default-src 'self';connect-src 'self' http://localhost:3000 http://localhost:6001 ws://localhost:6001 wss: https://accounts.google.com https://www.googleapis.com https://*.googleusercontent.com;script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 http://localhost:6001;style-src 'self' 'unsafe-inline';img-src 'self' data: https: http://localhost:3000 http://localhost:6001 https://developers.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com;base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'none';object-src 'none';script-src-attr 'none';upgrade-insecure-requests

Confirmaciones:
- frame-ancestors: 'none'
- base-uri: 'self'
- form-action: 'self'
- X-Powered-By: ausente

## Comando de reproduccion
curl -I -sS http://localhost:6001/
