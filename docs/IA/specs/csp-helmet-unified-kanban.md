# Kanban Simplificado - CSP Helmet Unified

Fuente:
- docs/IA/specs/csp-helmet-unified-tasks.md

Criterio de uso:
- Actualizar Estado y Proxima accion en cada daily.
- Mantener bloqueos explicitados con causa y dependencia.

## Tablero

| Task | Owner | Prioridad | Estado | Dependencias | Proxima accion |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Seguridad de Aplicacion | P0 | Done | - | Baseline completado y evidenciado en docs/IA/specs/csp-helmet-baseline-2026-09-14.md. |
| SEC-002 | Frontend Platform | P0 | Done | SEC-001 | Inventario completado con riesgo por pagina en docs/IA/specs/csp-helmet-sec002-inventory-2026-09-14.md. |
| SEC-003 | Arquitectura Backend | P0 | Done | SEC-001 | Extraccion completada a app/middlewares/security.js y wiring aplicado en server.js antes de rutas. |
| SEC-004 | Arquitectura Backend | P1 | Done | SEC-003 | Implementado y verificado: X-Powered-By ausente (evidencia en csp-helmet-sec004-sec005-validation-2026-09-14.md). |
| SEC-005 | Seguridad de Aplicacion | P0 | Done | SEC-003 | Validado en runtime: CSP con frame-ancestors='none' y directivas criticas activas (evidencia en csp-helmet-sec004-sec005-validation-2026-09-14.md). |
| SEC-006 | Frontend Platform | P0 | Done | SEC-002, SEC-005 | Meta CSP retiradas en HTML publico y validacion runtime documentada en docs/IA/specs/csp-helmet-sec006-validation-2026-09-14.md. |
| SEC-007 | Seguridad de Aplicacion | P0 | Done | SEC-006 | unsafe-eval retirado en script-src de production y validado en prueba aislada (ver csp-helmet-sec007-sec008-validation-2026-09-14.md). |
| SEC-008 | Seguridad de Aplicacion + Frontend Platform | P0 | Done | SEC-007 | 0 inline scripts en public HTML y script-src de production sin unsafe-inline (ver csp-helmet-sec007-sec008-validation-2026-09-14.md). |
| SEC-009 | Frontend Platform | P1 | Done | SEC-006 | Excepciones temporales documentadas y toggle estricto listo (`CSP_ALLOW_INLINE_STYLE_PROD=false`) con evidencia en csp-helmet-sec009-style-src-2026-09-14.md. |
| SEC-010 | Plataforma y DevOps | P0 | Done | SEC-003 | Fail-fast implementado en middleware de seguridad con validaciones criticas y pruebas (ver csp-helmet-sec010-sec012-validation-2026-09-14.md). |
| SEC-011 | Seguridad de Aplicacion | P1 | Done | SEC-003 | Endurecido con fail-fast: en production no permite wildcard cuando credentials esta activo (ver csp-helmet-sec011-sec013-validation-2026-09-14.md). |
| SEC-012 | QA/Backend | P0 | Done | SEC-005, SEC-010 | Gate automatizado de headers/CSP implementado en testing/securityHeadersGate.sh y validado (ver csp-helmet-sec010-sec012-validation-2026-09-14.md). |
| SEC-013 | QA + Frontend Platform | P0 | Done | SEC-008, SEC-009, SEC-012 | Smoke OAuth + rutas criticas ejecutado con PASS=18 FAIL=0 (ver csp-helmet-sec011-sec013-validation-2026-09-14.md). |
| SEC-014 | Arquitectura Backend | P1 | Done | SEC-013 | Cierre documental final y estado global completado (ver csp-helmet-sec014-final-closure-2026-09-14.md). |

## WIP recomendado
- Maximo en paralelo: 3 tasks.
- Priorizar ruta critica: SEC-001 -> SEC-003 -> SEC-005 -> SEC-006 -> SEC-007 -> SEC-008 -> SEC-010 -> SEC-012 -> SEC-013 -> SEC-014.

## Reglas de estado
- Todo: no iniciado.
- In Progress: en ejecucion con responsable activo.
- Review: implementado, pendiente validacion.
- Done: validado con evidencia.
- Blocked: impedido por dependencia o incidencia externa.
