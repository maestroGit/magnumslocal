# Plan Ejecutable - Unificacion CSP + Helmet (magnumslocal)

## 1. Objetivo
Convertir la especificacion de CSP/Helmet en una implementacion segura, gradual y verificable, minimizando rupturas en frontend y autenticacion OAuth.

Documento de referencia principal:
- docs/IA/specs/csp-helmet-unified-spec.md

Documento normativo:
- docs/IA/standards.md

## 2. Estado actual resumido
Brechas detectadas en el proyecto:
- Configuracion de CSP/Helmet embebida en server.js (no centralizada).
- Uso de unsafe-inline y unsafe-eval en script-src.
- Uso de unsafe-inline en style-src.
- Presencia de CSP duplicada por meta tags en varios HTML.
- Falta de modo fail-fast explicito para configuracion de seguridad critica.

## 3. Estrategia de adopcion
Principio: endurecimiento progresivo por fases con validacion objetiva por cada hito.

Secuencia:
1. Centralizar y estabilizar.
2. Eliminar duplicidad de politicas.
3. Endurecer produccion.
4. Activar controles de cumplimiento automatizables.

## 4. Fases de implementacion

### Fase 0 - Baseline y cobertura de pruebas
Objetivo:
- Capturar comportamiento actual antes de cambios.

Tareas:
- Ejecutar prueba de headers de seguridad existente.
- Registrar capturas de respuesta de cabeceras en local.
- Inventariar todas las paginas HTML con meta CSP.

Criterio de salida:
- Baseline documentado para comparar regresiones.

Riesgo principal:
- Cambiar sin linea base y no detectar ruptura.

Mitigacion:
- No avanzar de fase sin baseline guardado.

### Fase 1 - Centralizacion del middleware de seguridad
Objetivo:
- Extraer CSP/Helmet/CORS a un modulo unico de seguridad.

Tareas:
- Crear modulo central (ej. app/middlewares/security.js o src/middlewares/security.js).
- Mover logica de parseo de origenes, directivas CSP y opciones CORS.
- Registrar app.use(securityMiddleware) antes de rutas.
- Asegurar desactivacion de x-powered-by en bootstrap.

Criterio de salida:
- server.js deja de definir politicas CSP inline.
- Seguridad HTTP aplicada desde un solo modulo.

Riesgo principal:
- Orden de middleware incorrecto.

Mitigacion:
- Validar pipeline: seguridad antes de static y rutas.

### Fase 2 - Politica CSP coherente sin duplicidad
Objetivo:
- Eliminar conflicto entre CSP por header y CSP por meta HTML.

Tareas:
- Retirar meta CSP en HTML publicos que dependen del header del servidor.
- Mantener excepciones solo donde exista justificacion temporal documentada.
- Verificar que OAuth y recursos necesarios sigan operativos.

Criterio de salida:
- Una sola fuente de verdad para CSP: header HTTP via Helmet.

Riesgo principal:
- Ruptura de paginas legacy con scripts inline.

Mitigacion:
- Inventario de scripts inline y plan de migracion progresiva.

### Fase 3 - Endurecimiento por entorno (produccion estricta)
Objetivo:
- Cumplir estrictez de spec en produccion.

Tareas:
- Produccion: remover unsafe-eval de script-src.
- Produccion: remover unsafe-inline de script-src.
- Produccion: limitar style-src a self salvo excepcion justificada y temporal.
- Mantener allowances estrictamente necesarias para OAuth en connect-src/form-action.

Criterio de salida:
- Politica de produccion alineada con spec y standards.

Riesgo principal:
- Funcionalidad frontend bloqueada por CSP.

Mitigacion:
- Activar primero en staging y revisar consola CSP violations.

### Fase 4 - Fail-fast y gobernanza de seguridad
Objetivo:
- Evitar arranque en estado inseguro o incompleto.

Tareas:
- Validar al arranque presencia y coherencia de variables criticas (ALLOWED_ORIGINS, dominios OAuth, entorno).
- Abort startup si falta directiva CSP critica o config invalida.
- Documentar errores operativos esperables y su resolucion.

Criterio de salida:
- El proceso no inicia con configuracion de seguridad inconsistente.

Riesgo principal:
- Fallos de arranque por configuraciones incompletas en entornos antiguos.

Mitigacion:
- Checklist previo de variables por entorno.

### Fase 5 - Verificacion automatizada y cierre
Objetivo:
- Convertir cumplimiento en verificacion repetible.

Tareas:
- Añadir checks automatizables de cabeceras en scripts de testing.
- Verificar presencia de:
  - Content-Security-Policy
  - X-Content-Type-Options: nosniff
  - X-Frame-Options
- Validar ausencia de unsafe-eval en produccion.
- Registrar evidencia de cero bloqueos criticos en frontend.

Criterio de salida:
- Criterios de aceptacion de spec cubiertos con evidencia.

Riesgo principal:
- Falsos positivos por pruebas incompletas.

Mitigacion:
- Combinar validacion por curl + smoke browser de rutas clave.

## 5. Criterios de aceptacion por fase

### Minimos tecnicos
- Politica CSP servida por header HTTP y coherente en todo el nodo.
- Modulo de seguridad centralizado y desacoplado de logica de negocio.
- Entorno production sin unsafe-eval.
- Entorno production sin unsafe-inline en script-src.
- Controles fail-fast activos para configuracion critica.

### Minimos funcionales
- Login OAuth funcional.
- Paginas estaticas clave cargan sin errores bloqueantes.
- Endpoints principales responden con headers de seguridad esperados.

## 6. Matriz de riesgos y rollback

### Riesgos
- Ruptura de frontend legacy por inline scripts.
- Denegacion de origenes legitimos por CORS/CSP demasiado restrictivo.
- Fallo de arranque por validaciones nuevas.

### Rollback por fase
- Fase 1: revertir solo wiring del middleware central.
- Fase 2: restaurar temporalmente meta CSP en paginas afectadas mientras se corrige.
- Fase 3: restaurar excepciones CSP solo en staging y con ticket de deuda tecnica.
- Fase 4: permitir modo degradado solo en development, nunca en production.

## 7. Plan de ejecucion sugerido (sprints)
Sprint 1:
- Fase 0 + Fase 1.

Sprint 2:
- Fase 2 + verificacion funcional OAuth/frontend.

Sprint 3:
- Fase 3 en staging, luego production.

Sprint 4:
- Fase 4 + Fase 5 y cierre de evidencia.

## 8. Evidencias requeridas para cerrar
- Captura de headers por curl en entorno local/staging.
- Log de arranque mostrando carga de modulo de seguridad y config valida.
- Registro de pruebas funcionales de login y paginas clave.
- Checklist firmado contra csp-helmet-unified-spec.md.

## 9. Responsables
- Arquitectura Backend: definicion tecnica y aprobacion de directivas.
- Seguridad de Aplicacion: validacion de politica final y excepciones.
- Plataforma y DevOps: variables de entorno, despliegue y monitoreo.
- Frontend Platform: remocion de dependencias inline y pruebas de carga.

## 10. Estado del plan
- Estado: completado.
- Fecha: 2026-09-14.
- Referencia: csp-helmet-unified-spec.md.
- Cierre documental: docs/IA/specs/csp-helmet-sec014-final-closure-2026-09-14.md.