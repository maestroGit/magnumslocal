# Task List - CSP Helmet Unified (magnumslocal)

## Objetivo
Backlog operativo para ejecutar la unificacion CSP + Helmet definida en:
- docs/IA/specs/csp-helmet-unified-spec.md
- docs/IA/specs/csp-helmet-unified-plan.md

## Convenciones
- Prioridad: P0 (critica), P1 (alta), P2 (media)
- Estado: Todo, In Progress, Review, Done, Blocked
- Estimacion: XS (<0.5d), S (0.5-1d), M (1-2d), L (2-4d)

---

## Resumen de fases
- Fase 0: Baseline y auditoria
- Fase 1: Centralizacion middleware
- Fase 2: Unificacion CSP (sin duplicidad)
- Fase 3: Endurecimiento produccion
- Fase 4: Fail-fast y gobernanza
- Fase 5: Verificacion automatizada

---

## Backlog de tasks

### SEC-001
- Titulo: Levantar baseline de headers y comportamiento actual
- Fase: 0
- Prioridad: P0
- Estado: Todo
- Owner: Seguridad de Aplicacion
- Estimacion: S
- Dependencias: ninguna
- Archivos objetivo: testing/test-phase-1-auth.sh, docs internos de evidencia
- Descripcion: Capturar estado actual de headers de seguridad y posibles violaciones CSP antes de cambios.
- Criterio de aceptacion:
  - Existe evidencia de cabeceras actuales en local/staging.
  - Se documentan rutas probadas y resultado por ruta.
- Evidencia requerida:
  - Salida de curl -I por endpoints clave.

### SEC-002
- Titulo: Inventario de CSP duplicada en HTML publico
- Fase: 0
- Prioridad: P0
- Estado: Todo
- Owner: Frontend Platform
- Estimacion: S
- Dependencias: SEC-001
- Archivos objetivo: public/*.html
- Descripcion: Identificar todas las meta CSP activas y su impacto esperado al retirarlas.
- Criterio de aceptacion:
  - Lista completa de paginas con meta CSP.
  - Riesgo por pagina clasificado (alto/medio/bajo).

### SEC-003
- Titulo: Crear modulo central de seguridad (Helmet + CSP + CORS)
- Fase: 1
- Prioridad: P0
- Estado: Todo
- Owner: Arquitectura Backend
- Estimacion: M
- Dependencias: SEC-001
- Archivos objetivo: app/middlewares/security.js (o src/middlewares/security.js), server.js
- Descripcion: Extraer toda la logica de seguridad HTTP a un middleware unico reusado por server.
- Criterio de aceptacion:
  - No hay definicion inline de CSP en server.js.
  - app.use(securityMiddleware) se registra antes de rutas.

### SEC-004
- Titulo: Desactivar x-powered-by en bootstrap
- Fase: 1
- Prioridad: P1
- Estado: Todo
- Owner: Arquitectura Backend
- Estimacion: XS
- Dependencias: SEC-003
- Archivos objetivo: server.js
- Descripcion: Aplicar hardening basico exigido por spec.
- Criterio de aceptacion:
  - Header X-Powered-By no aparece en respuestas.

### SEC-005
- Titulo: Normalizar directivas CSP criticas en middleware
- Fase: 1
- Prioridad: P0
- Estado: Todo
- Owner: Seguridad de Aplicacion
- Estimacion: M
- Dependencias: SEC-003
- Archivos objetivo: app/middlewares/security.js
- Descripcion: Asegurar inclusion explicita de default-src, connect-src, frame-ancestors, base-uri, form-action.
- Criterio de aceptacion:
  - Header CSP incluye todas las directivas criticas de spec.

### SEC-006
- Titulo: Retirar meta CSP duplicadas en HTML
- Fase: 2
- Prioridad: P0
- Estado: Todo
- Owner: Frontend Platform
- Estimacion: M
- Dependencias: SEC-002, SEC-005
- Archivos objetivo: public/*.html
- Descripcion: Eliminar CSP por meta para dejar una sola fuente de verdad en header HTTP.
- Criterio de aceptacion:
  - No quedan meta http-equiv="Content-Security-Policy" en paginas bajo control del nodo.
  - Frontend sigue cargando correctamente.

### SEC-007
- Titulo: Endurecer script-src en produccion (sin unsafe-eval)
- Fase: 3
- Prioridad: P0
- Estado: Todo
- Owner: Seguridad de Aplicacion
- Estimacion: S
- Dependencias: SEC-006
- Archivos objetivo: app/middlewares/security.js
- Descripcion: Retirar unsafe-eval en entorno production.
- Criterio de aceptacion:
  - CSP de production no contiene unsafe-eval.

### SEC-008
- Titulo: Endurecer script-src en produccion (sin unsafe-inline)
- Fase: 3
- Prioridad: P0
- Estado: Todo
- Owner: Seguridad de Aplicacion + Frontend Platform
- Estimacion: L
- Dependencias: SEC-007
- Archivos objetivo: app/middlewares/security.js, public/*.html, public/**/*.js
- Descripcion: Migrar/remover dependencias de inline script para cumplir CSP estricta en production.
- Criterio de aceptacion:
  - CSP de production no contiene unsafe-inline en script-src.
  - No hay bloqueos criticos en rutas clave.

### SEC-009
- Titulo: Restringir style-src en produccion a self
- Fase: 3
- Prioridad: P1
- Estado: Todo
- Owner: Frontend Platform
- Estimacion: M
- Dependencias: SEC-006
- Archivos objetivo: app/middlewares/security.js, public/*.html, public/**/*.css
- Descripcion: Eliminar dependencias de estilos inline o dejarlas documentadas como excepcion temporal.
- Criterio de aceptacion:
  - style-src en production limitado a self o excepciones aprobadas.

### SEC-010
- Titulo: Validacion fail-fast de configuracion critica
- Fase: 4
- Prioridad: P0
- Estado: Todo
- Owner: Plataforma y DevOps
- Estimacion: S
- Dependencias: SEC-003
- Archivos objetivo: modulo de configuracion, middleware de seguridad
- Descripcion: Bloquear arranque con configuracion insegura/incompleta.
- Criterio de aceptacion:
  - Arranque falla explicitamente si faltan variables criticas.

### SEC-011
- Titulo: Revisar politica CORS en modo credenciales
- Fase: 4
- Prioridad: P1
- Estado: Todo
- Owner: Seguridad de Aplicacion
- Estimacion: S
- Dependencias: SEC-003
- Archivos objetivo: app/middlewares/security.js
- Descripcion: Evitar combinaciones peligrosas de wildcard y credentials.
- Criterio de aceptacion:
  - En production no existe configuracion permisiva incompatible con credentials.

### SEC-012
- Titulo: Test automatizado de headers de seguridad
- Fase: 5
- Prioridad: P0
- Estado: Todo
- Owner: QA/Backend
- Estimacion: M
- Dependencias: SEC-005, SEC-010
- Archivos objetivo: testing/test-phase-1-auth.sh (o nuevo script dedicado)
- Descripcion: Convertir criterios de aceptacion del spec en checks repetibles.
- Criterio de aceptacion:
  - Test valida CSP, X-Content-Type-Options y X-Frame-Options.
  - Test falla si production incluye unsafe-eval.

### SEC-013
- Titulo: Smoke test OAuth y paginas criticas bajo CSP endurecida
- Fase: 5
- Prioridad: P0
- Estado: Todo
- Owner: QA + Frontend Platform
- Estimacion: M
- Dependencias: SEC-008, SEC-009, SEC-012
- Archivos objetivo: flujo funcional (sin cambios de codigo obligatorios)
- Descripcion: Verificar login OAuth y carga de vistas sin errores CSP bloqueantes.
- Criterio de aceptacion:
  - Flujo de login operativo.
  - Consola sin errores CSP criticos en rutas principales.

### SEC-014
- Titulo: Cierre documental y trazabilidad ADR
- Fase: 5
- Prioridad: P1
- Estado: Todo
- Owner: Arquitectura Backend
- Estimacion: S
- Dependencias: SEC-013
- Archivos objetivo: docs/IA/specs/csp-helmet-unified-spec.md, docs/IA/specs/csp-helmet-unified-plan.md, docs/IA/standards.md
- Descripcion: Marcar cumplimiento, excepciones pendientes y decision log final.
- Criterio de aceptacion:
  - Documentacion actualizada con estado final y deudas tecnicas abiertas.

---

## Ruta critica recomendada
1. SEC-001
2. SEC-003
3. SEC-005
4. SEC-006
5. SEC-007
6. SEC-008
7. SEC-010
8. SEC-012
9. SEC-013
10. SEC-014

## Definicion de Done global (DoD)
Un task se considera Done solo si:
- Cumple su criterio de aceptacion.
- Incluye evidencia verificable.
- No degrada login OAuth ni rutas core.
- Mantiene alineacion con docs/IA/standards.md.
