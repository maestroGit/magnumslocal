# Validacion SEC-007 y SEC-008 (2026-09-14)

## Alcance
- SEC-007: retirar `unsafe-eval` en `script-src` para entorno `production`.
- SEC-008: eliminar dependencia de inline scripts y retirar `unsafe-inline` en `script-src` para `production`.

## Cambios aplicados
1. CSP por entorno en middleware central:
- Archivo: app/middlewares/security.js
- `script-src` en production queda sin `unsafe-inline` y sin `unsafe-eval`.
- `script-src` en development mantiene flexibilidad temporal para compatibilidad legacy.

2. Extraccion de inline scripts en view y paginas relacionadas:
- Nuevos modulos:
  - public/js/features/authHeaderBootstrap.js
  - public/js/features/viewWalletModalBootstrap.js
  - public/js/features/viewNotificationsBootstrap.js
  - public/js/features/burnWsClient.js
  - public/js/bootstrap-auth-component.js
  - public/js/runtime-map-link.js
- HTML actualizados para consumir `src` externos:
  - public/view.html
  - public/consume-keystore.html
  - public/history-keystore.html
  - public/import-keystore.html
  - public/keystore.html
  - public/transfer-keystore.html
  - public/login.html

## Verificacion estatica
- Busqueda de scripts inline (`<script>` sin `src`) en `magnumslocal/public/**/*.html`:
  - Resultado: 0 coincidencias.

## Verificacion de politica production (prueba aislada)
Prueba ejecutada con app Express minima registrando `registerSecurityMiddleware(app, { isProduction: true })`.

Resultado sobre `script-src`:
- `SCRIPT_SRC=script-src 'self' http://localhost:3000 http://localhost:6001`
- `SCRIPT_SRC_HAS_UNSAFE_INLINE=false`
- `SCRIPT_SRC_HAS_UNSAFE_EVAL=false`

## Resultado final
- SEC-007: Done.
- SEC-008: Done.

## Riesgo residual
- `style-src` mantiene `unsafe-inline` por compatibilidad; su retirada pertenece a SEC-009.
