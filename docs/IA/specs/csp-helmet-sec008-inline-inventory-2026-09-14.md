# Inventario SEC-008 - Dependencia de inline scripts (2026-09-14)

## Objetivo
Preparar la retirada de `unsafe-inline` en `script-src` para `production`, identificando y reduciendo scripts inline remanentes.

## Cambios ejecutados en esta iteracion
Se extrajeron scripts inline de bajo riesgo a archivos JS externos:

1. Nuevo archivo: public/js/bootstrap-auth-component.js
- Centraliza bootstrap de auth (fetch /auth/user + carga de AuthComponent).
- Sustituye bloques repetidos en:
  - public/consume-keystore.html
  - public/history-keystore.html
  - public/import-keystore.html
  - public/keystore.html
  - public/transfer-keystore.html

2. Nuevo archivo: public/js/runtime-map-link.js
- Extrae configuracion inline de link de mapa en:
  - public/login.html

## Estado actual de inline scripts
Tras la extraccion, quedan 4 bloques inline, todos en:
- public/view.html
  - script module de inicializacion wallet modal
  - script module de notifications dashboard
  - script module de cliente WebSocket BURN
  - bloque adicional module en el mismo flujo de dashboard

## Evaluacion de riesgo
- Alto: public/view.html (pantalla principal, alta complejidad funcional, multiples imports y listeners).
- Bajo/Resuelto: paginas de keystore/login tratadas en esta iteracion.

## Plan de migracion para cierre SEC-008
1. Crear modulos dedicados en public/js/features/ para cada bloque inline de view.html:
- view-wallet-modal-bootstrap.js
- view-notifications-bootstrap.js
- burn-ws-client.js

2. Reemplazar cada `<script type="module">` inline por `<script type="module" src="...">`.

3. Verificar no regresion en:
- apertura de wallet modal
- panel de notificaciones BURN
- eventos walletChanged
- carga completa de dashboard y acciones principales

4. Solo tras dejar 0 inline scripts en public HTML, retirar `unsafe-inline` de `script-src` en production (cierre de SEC-008).
