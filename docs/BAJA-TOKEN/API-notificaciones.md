# API de Notificaciones

## Objetivo
Documentar la implementación actual del flujo de notificaciones del dashboard en `magnumslocal`, centrada en:

1. La API HTTP de lectura y marcado como leído.
2. La UI del dashboard que consume esas notificaciones.
3. La conexión con el flujo de burn y con la notificación en tiempo real.

## Alcance actual
La funcionalidad ya implementada vive en estos archivos:

- [app/controllers/notificationController.js](app/controllers/notificationController.js)
- [app/routes/notificationRoutes.js](app/routes/notificationRoutes.js)
- [public/js/features/notificationsDashboard.js](public/js/features/notificationsDashboard.js)
- [public/js/auth-component.js](public/js/auth-component.js)
- [public/view.html](public/view.html)

El dashboard ya no depende solo de `burn_events` para mostrar el estado visual. La persistencia real se almacena en la tabla `notifications`, y `burn_events` sigue actuando como evidencia histórica del burn on-chain.

## Tablas y modelos implicados

### 1. `notifications`
Fuente principal del dashboard para el estado visual de las notificaciones.

#### Modelo
- [app/models/Notification.js](app/models/Notification.js)

#### Campos
- `id` - PK autoincremental.
- `winery_id` - identificador de la bodega destinataria.
- `type` - tipo de evento, ahora `TOKEN_BURNED`.
- `tx_id` - transacción on-chain asociada.
- `burn_address` - dirección burn detectada.
- `amount` - cantidad quemada.
- `payload` - JSONB con el detalle funcional del evento.
- `read` - estado leído/no leído.
- `fecha` - fecha de creación del evento.

#### Uso
Se crea desde [app/services/notificationService.js](app/services/notificationService.js) y se consulta desde la API de dashboard.

### 2. `burn_events`
Tabla histórica del evento on-chain. Sigue siendo útil para auditoría y trazabilidad de la cadena.

#### Modelo
- [app/models/BurnEvent.js](app/models/BurnEvent.js)

#### Campos
- `id`
- `tx_id`
- `burn_address`
- `amount`
- `fecha`

#### Uso
Se sigue insertando desde los flujos de minado y `replaceChain` como registro técnico del burn.

### 3. `usuarios`
Tabla de referencia para resolver el receptor de la notificación.

#### Modelo
- [app/models/User.js](app/models/User.js)

#### Campos relevantes para este flujo
- `id`
- `nombre`
- `email`
- `role`
- `provider`

#### Uso
La API usa `User.findByPk(wineryId)` para validar que la bodega exista antes de devolver notificaciones.

### 4. `wallets` y modelos asociados
No son parte directa de la persistencia de notificaciones, pero ayudan a contextualizar el usuario autenticado y su wallet activa en el dashboard.

#### Modelos relacionados
- [app/models/Wallet.js](app/models/Wallet.js)
- [app/models/index.js](app/models/index.js)

#### Uso
Se apoyan en la experiencia del dashboard y en la autenticación, aunque no persisten el historial de notificaciones.

## API HTTP

### GET /notifications?wineryId=xxx
Devuelve el historial de notificaciones persistidas para una bodega concreta.

#### Parámetro
- `wineryId`: identificador de la bodega/usuario que actúa como clave de consulta.

#### Comportamiento
1. Valida que `wineryId` exista.
2. Busca la bodega en `usuarios` mediante `User.findByPk(wineryId)`.
3. Consulta la tabla `notifications` filtrando por `winery_id`.
4. Ordena por `fecha DESC`.
5. Devuelve una colección normalizada para la UI.

#### Respuesta de ejemplo
```json
{
	"success": true,
	"wineryId": "email_1772802313933_yo5ov3etz",
	"winery": {
		"id": "email_1772802313933_yo5ov3etz",
		"nombre": "Traslascuestas",
		"email": "info@bodegastraslascuestas.com"
	},
	"count": 1,
	"notifications": [
		{
			"id": 12,
			"wineryId": "email_1772802313933_yo5ov3etz",
			"type": "TOKEN_BURNED",
			"payload": {
				"txId": "8fae3eea6e80e3cf3e94cae4e6e1b667fda4125080854218354bd504df5e8bd1",
				"burnAddress": "0x0000000000000000000000000000000000000000EMAIL_1772802313933_",
				"amount": 120,
				"fecha": "2026-08-05T15:53:37.863Z"
			},
			"read": false,
			"createdAt": "2026-08-05T15:53:37.863Z"
		}
	]
}
```

#### Errores posibles
- `400` si falta `wineryId`.
- `404` si la bodega no existe.
- `500` si falla la consulta o la serialización.

### POST /notifications/mark-as-read
Marca como leídas una o varias notificaciones.

#### Body soportado
```json
{
	"wineryId": "email_1772802313933_yo5ov3etz",
	"notificationIds": [12, 13]
}
```

#### Comportamiento
1. Valida `wineryId`.
2. Si no se envía `notificationIds`, marca como leídas todas las notificaciones no leídas de esa bodega.
3. Si se envía `notificationIds`, solo actualiza las filas indicadas.
4. Devuelve un resumen de actualización.

#### Respuesta de ejemplo
```json
{
	"success": true,
	"wineryId": "email_1772802313933_yo5ov3etz",
	"updatedCount": 1
}
```

## Routing
La ruta se registra en `server.js` con:

```js
app.use('/', notificationRoutes);
```

Y expone:

- `GET /notifications`
- `POST /notifications/mark-as-read`

## Persistencia
La persistencia real está en [app/models/Notification.js](app/models/Notification.js).

### Campos principales
- `id`
- `winery_id`
- `type`
- `tx_id`
- `burn_address`
- `amount`
- `payload` JSONB
- `read`
- `fecha`

### Creación de registros
Las notificaciones se insertan desde [app/services/notificationService.js](app/services/notificationService.js) con `persistBurnNotification()`.

Ese servicio se invoca desde:

- [app/controllers/miningController.js](app/controllers/miningController.js)
- [src/blockchain.js](src/blockchain.js)

Así se cubren ambos casos:

1. Burn minado localmente.
2. Burn recibido por `replaceChain`.

## UI del dashboard
La interfaz de usuario ya no está embebida solo como panel BURN aislado. Ahora el dashboard monta un widget de notificaciones que consume la API HTTP y reacciona a los eventos en tiempo real.

### Archivo principal
- [public/js/features/notificationsDashboard.js](public/js/features/notificationsDashboard.js)

### Montaje en la vista
La UI se inicializa desde [public/view.html](public/view.html) con:

```js
import { initNotificationsDashboard } from './js/features/notificationsDashboard.js';
initNotificationsDashboard();
```

### Dependencia sobre autenticación
El componente de autenticación expone el usuario actual en `window.currentUser` y emite el evento:

- `auth-user-changed`

Eso permite que el panel de notificaciones sepa qué `wineryId` consultar.

### Flujo visual
1. Si hay usuario autenticado, el dashboard consulta `GET /notifications`.
2. Se renderiza un widget flotante con campana y badge de no leídas.
3. El usuario puede abrir el drawer, refrescar manualmente y marcar notificaciones como leídas.
4. Si llega un burn por WS, se dispara el evento interno `burn-notification-received` y la UI inserta la notificación en caliente.

### Estado visual mostrado
El widget muestra:

- contador de no leídas,
- lista de notificaciones,
- tipo de evento,
- txId,
- bodega,
- amount,
- wallet del winelover cuando está disponible,
- fecha de creación.

## Integración con tiempo real
La vista principal sigue escuchando los mensajes BURN por WebSocket. Cuando llega un mensaje válido:

1. se actualiza el panel BURN existente,
2. se despacha `burn-notification-received`,
3. el widget de notificaciones persiste el evento en la UI local.

## Resultado funcional
Con esta implementación, el flujo visual queda cerrado así:

1. Se detecta un burn.
2. Se persiste en `notifications`.
3. Se expone vía `GET /notifications`.
4. La UI lo muestra en el dashboard.
5. Se marca como leído con `POST /notifications/mark-as-read`.
6. Si entra en tiempo real, también aparece sin recargar.

## Nota técnica
`burn_events` sigue siendo útil como tabla histórica del evento on-chain, pero la fuente que usa el dashboard para su estado visual ya es `notifications`.
