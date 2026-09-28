# Validacion SEC-006 - Retirada de meta CSP duplicada (2026-09-14)

## Alcance
Retirada de etiquetas meta CSP en HTML publico para dejar una sola fuente de verdad: cabecera HTTP configurada en middleware central.

## Archivos modificados
- public/complete-profile.html
- public/forgot-password.html
- public/list-winery.html
- public/login.html
- public/register.html
- public/reset-password.html
- public/view.html

## Verificacion estatica
- Busqueda de `http-equiv="Content-Security-Policy"` en public/**/*.html: 0 coincidencias.

## Verificacion runtime
- GET/HEAD / -> HTTP 200 con header Content-Security-Policy presente.
- GET/HEAD /login.html -> HTTP 200 con header Content-Security-Policy presente.
- GET/HEAD /auth/user -> HTTP 401 con header Content-Security-Policy presente.
- En /, la directiva efectiva incluye frame-ancestors 'none'.

## Resultado
- SEC-002: inventario completado.
- SEC-006: completada la unificacion de politica CSP por header HTTP sin meta duplicadas en HTML.
