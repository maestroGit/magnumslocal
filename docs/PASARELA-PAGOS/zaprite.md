# Zaprite como pasarela de pagos (Bitcoin + Lightning)

## Que es Zaprite

Zaprite es una pasarela de pagos para cobrar en Bitcoin de dos formas:

- On-chain (capa principal de Bitcoin).
- Lightning Network (pagos casi instantaneos y comisiones bajas).

El flujo normal es generar una factura y mostrar un codigo QR para que el cliente pague desde su billetera. Segun la configuracion, la factura puede aceptar pago en capa principal, en Lightning, o ambas.

## Como funciona el cobro con QR

1. El comercio crea una factura (importe, moneda, concepto, expiracion).
2. Zaprite genera datos de pago y QR.
3. El cliente escanea el QR con su wallet.
4. El cliente confirma el pago:
	- Si es on-chain: se emite transaccion en la red Bitcoin.
	- Si es Lightning: se paga una invoice LN.
5. Zaprite actualiza estado de la factura (pending/paid/expired).
6. El backend recibe confirmacion (webhook o consulta de estado) y marca pedido como pagado.

## Pasos para integrarlo como forma de cobro

### Fase 1: Preparacion

1. Crear cuenta en Zaprite.
2. Configurar billeteras de recepcion:
	- Direccion on-chain (BTC).
	- Wallet Lightning (LUD16, nodo LN, o proveedor compatible).
3. Definir politicas de cobro:
	- Moneda base (EUR/USD/BTC).
	- Tiempo de expiracion de factura.
	- Tolerancia de tipo de cambio.

### Fase 2: Integracion tecnica minima

1. Crear endpoint en backend para "crear cobro".
2. Desde ese endpoint llamar a Zaprite API para crear factura.
3. Guardar en base de datos:
	- payment_id externo (Zaprite).
	- order_id interno.
	- importe, moneda, estado.
4. Devolver al frontend:
	- URL de checkout o payload QR.
	- estado inicial de la factura.

### Fase 3: Confirmacion de pago

1. Implementar webhook receptor (recomendado):
	- Verificar firma/autenticidad del webhook.
	- Procesar eventos de factura pagada.
2. Actualizar estado de pedido a "pagado" solo cuando el evento sea valido.
3. Implementar idempotencia para evitar doble procesamiento.
4. Como respaldo, permitir polling de estado si el webhook falla.

### Fase 4: Operacion y seguridad

1. Registrar logs de todos los eventos de pago.
2. Manejar expiracion y reintento de factura.
3. Definir politica de confirmaciones on-chain (0-conf, 1-conf, etc).
4. Separar entornos sandbox y produccion.
5. Proteger claves API en variables de entorno y secretos.

## Nivel de dificultad estimado

- Basico (bajo-medio):
  - Solo redirigir a checkout de Zaprite.
  - Sin webhook, con verificacion manual.
  - Tiempo: 0.5 a 1 dia.

- Intermedio (medio):
  - Crear factura por API + mostrar QR en frontend.
  - Webhook para marcar pedido pagado.
  - Tiempo: 1 a 3 dias.

- Avanzado (medio-alto):
  - Soporte dual completo (on-chain + Lightning) con reglas por red.
  - Reconciliacion automatica, reintentos, observabilidad y alertas.
  - Tiempo: 3 a 7 dias.

## Recomendacion practica para empezar

1. Empezar por Lightning + webhook (mejor UX para pagos rapidos).
2. Mantener on-chain habilitado para importes altos o wallets sin LN.
3. Definir una maquina de estados de pago clara:
	- created -> pending -> paid -> confirmed -> settled
4. No entregar producto/servicio hasta estado de pago valido segun politica definida.

## Checklist minimo de salida a produccion

- API key en secreto seguro.
- Endpoint de webhook con validacion de firma.
- Idempotencia en eventos de pago.
- Registro de auditoria de estados.
- Manejo de facturas expiradas y pagos tardios.
- Pruebas end-to-end en sandbox y produccion.

## Roadmap recomendado (para activarlo cuando lo decidas)

### Etapa 0: Decision y alcance (0.5 dia)

Objetivo: decidir si se activa solo Lightning o Lightning + on-chain desde el inicio.

Tareas:

1. Elegir alcance inicial:
	- Opcion A: solo Lightning (MVP rapido).
	- Opcion B: dual (Lightning + on-chain).
2. Definir politica de confirmacion:
	- Lightning: pago recibido.
	- On-chain: numero de confirmaciones requerido.
3. Definir responsables (backend, frontend, operaciones).

Entregable:

- Documento corto de alcance y reglas de negocio.

Criterio para pasar a Etapa 1:

- Alcance aprobado y criterios de pago definidos.

### Etapa 1: PoC tecnica (1 a 2 dias)

Objetivo: demostrar que puedes crear factura y recibir callback de pago.

Tareas:

1. Crear cuenta y credenciales de Zaprite en entorno de pruebas.
2. Implementar endpoint backend de prueba para crear factura.
3. Mostrar QR en una pantalla de test.
4. Implementar webhook minimo y log de eventos.

Entregable:

- Demo interna: QR creado + evento de pago recibido.

Criterio para pasar a Etapa 2:

- 1 pago de prueba completado end-to-end sin intervencion manual.

### Etapa 2: Integracion MVP (2 a 4 dias)

Objetivo: habilitar cobro real en un flujo controlado.

Tareas:

1. Integrar creacion de factura en flujo de checkout real.
2. Persistir tabla de pagos (payment_id, order_id, estado, importes, timestamps).
3. Implementar idempotencia webhook por event_id/payment_id.
4. Exponer estado de pago en UI (pending/paid/expired).

Entregable:

- MVP funcional para un tipo de pedido o canal de venta.

Criterio para pasar a Etapa 3:

- 5-10 pagos piloto procesados correctamente.

### Etapa 3: Piloto operativo (3 a 7 dias)

Objetivo: validar comportamiento en operacion real con volumen bajo.

Tareas:

1. Activar alertas basicas (webhook fallido, pago expirado, error API).
2. Definir reintentos y conciliacion diaria.
3. Entrenar a operacion/soporte con casos comunes.
4. Medir metricas: tasa de pago completado, tiempo medio, errores.

Entregable:

- Informe de piloto con incidencias y acciones correctivas.

Criterio para pasar a Etapa 4:

- Tasa de exito estable y sin incidencias criticas abiertas.

### Etapa 4: Produccion estable y escalado (continuo)

Objetivo: consolidar cobro como canal estable y auditable.

Tareas:

1. Hardening de seguridad (rotacion de secrets, permisos minimos).
2. Observabilidad completa (dashboards y alertas).
3. Procedimiento de recuperacion ante caidas de webhook/API.
4. Mejoras de UX (timeout visible, reintento de factura, historial pagos).

Entregable:

- Runbook de produccion + checklist de soporte.

### Plan rapido por semanas (referencia)

- Semana 1: Etapa 0 + Etapa 1.
- Semana 2: Etapa 2 (MVP en entorno real controlado).
- Semana 3: Etapa 3 (piloto y estabilizacion).
- Semana 4+: Etapa 4 (operacion y mejora continua).

## Decision final sugerida

Cuando decidas arrancar, activa primero Etapa 0 y no avances sin cerrar criterio de paso.
Este enfoque evita integrar rapido pero con riesgo operativo alto.
