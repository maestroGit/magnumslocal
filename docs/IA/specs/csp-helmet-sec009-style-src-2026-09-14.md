# SEC-009 - style-src en production y excepciones temporales (2026-09-14)

## Objetivo
Reducir `style-src` a `self` en production o documentar excepciones temporales sin romper frontend legacy.

## Implementacion aplicada
Archivo: app/middlewares/security.js

Se incorporo control por entorno y flag:
- production:
  - por defecto: `style-src 'self' 'unsafe-inline'` (modo compatibilidad temporal)
  - estricto: `style-src 'self'` cuando `CSP_ALLOW_INLINE_STYLE_PROD=false`
- development:
  - `style-src 'self' 'unsafe-inline'`

## Validacion tecnica
Prueba aislada ejecutada con `registerSecurityMiddleware(app, { isProduction: true })`:
- FLAG unset -> style-src 'self' 'unsafe-inline'
- FLAG true  -> style-src 'self' 'unsafe-inline'
- FLAG false -> style-src 'self'

Conclusión:
- La reduccion a `self` en production ya esta soportada de forma controlada.
- Se mantiene compatibilidad temporal por defecto mientras exista deuda de estilos inline.

## Excepciones temporales inventariadas (magnumslocal/public)
Se detectaron 38 coincidencias de `style=` o `<style>` en 8 archivos:
- public/consume-keystore.html
- public/forgot-password.html
- public/history-keystore.html
- public/import-keystore.html
- public/keystore.html
- public/reset-password.html
- public/transfer-keystore.html
- public/view.html

Riesgo/impacto:
- Alto: public/view.html, public/keystore.html
- Medio: consume/import/transfer/history-keystore
- Medio-Bajo: forgot-password, reset-password

## Plan de retiro de excepcion
1. Migrar atributos `style="..."` a clases CSS reutilizables en cada vista.
2. Extraer bloques `<style>` de forgot/reset-password a archivos CSS dedicados.
3. Ejecutar smoke visual y funcional de vistas clave.
4. Activar `CSP_ALLOW_INLINE_STYLE_PROD=false` en staging.
5. Promover a production tras validacion.

## Criterio de cierre SEC-009
- Opcion A (actual alcanzada): excepcion temporal documentada + mecanismo de endurecimiento listo.
- Opcion B (objetivo final): 0 estilos inline y `style-src 'self'` activo en production.
