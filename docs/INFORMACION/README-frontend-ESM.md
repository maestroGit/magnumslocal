# Frontend ESM Architecture Guide

Este documento resume la migración desde el antiguo `fetchData.js` monolítico hacia una arquitectura basada en módulos ES (ESM). Proporciona un mapa de archivos, patrones reutilizables y lineamientos para futuras extensiones.

## 1. Objetivos de la Migración
- Eliminar dependencias de *globals* (`window.*`) y reemplazarlas por `import`/`export` explícitos.
- Unificar experiencia de modales/toasts con un helper consistente (`safeModal`).
- Centralizar la delegación de eventos para reducir listeners duplicados y evitar `onclick` inline.
- Separar responsabilidades: API, render, features, UI helpers.
- Facilitar pruebas unitarias (Jest) y futuras evoluciones (validación previa, coin control avanzado, etc.).

## 2. Mapa de Módulos Principales
| Área | Archivo | Responsabilidad |
|------|---------|-----------------|
| Config | `public/js/core/config.js` | Base URL y constantes. |
| API | `public/js/core/api.js` | `fetchData(endpoint)`, helper de copiar TXID. |
| UI (Modales/Toasts) | `public/js/ui/modals.js` | `showModal`, `showModalForm`, `showToast`, `showProgressModal`, `safeModal`, inline modal. |
| Eventos | `public/js/events/dom.js` | Binding centralizado (botones dashboard, delegación `data-*`). |
| Render Blockchain | `public/js/render/blocks.js` | Render de bloques y transacciones de bloque. |
| Render Mempool | `public/js/render/mempool.js` | Estado y volumen del mempool. |
| Render Wallet | `public/js/render/wallet.js` | Balance, clave pública, carga archivo de wallet. |
| Render Monitor | `public/js/render/monitoring.js` | Información del sistema y nodos. |
| Feature Transacciones | `public/js/features/transactions.js` | Envío de transacción, coin control modal, confirmación. |
| Feature Baja Token | `public/js/features/bajaToken.js` | Formulario y envío de baja (`/baja-token`). |
| Feature Verificación | `public/js/features/verification.js` | Verificación de transacción QR con fallback progresivo. |
| Feature Trazabilidad | `public/js/features/traceability.js` | Generación de QR y registro de lote. |
| Wallet Modal | `public/js/features/walletModal.js` | Interfaz de gestión de wallet y UTXO en modal dedicado. |
| QR Tools | `public/js/qrProof.js` | Herramientas de test QR convertidas a ESM (usa imports directos). |
| Bootstrap | `public/js/bootstrap.js` | Punto de entrada: inicializa features y eventos (sin globals). |

## 3. Patrones Clave
### 3.1 safeModal
```
import { safeModal } from '../ui/modals.js';

safeModal('Título', '<p>Contenido HTML</p>');
```
Orden de preferencia internamente:
1. `showModalForm` si existe contenedor de formulario.
2. `showModal` si existe modal de error.
3. `alert` como último recurso.

### 3.2 Delegación de Eventos
En `events/dom.js` se añade un único listener global a `document.body` para acciones con atributos:
- `data-open-url` (abrir URL en nueva pestaña).
- `.show-block-txs-btn` (mostrar transacciones de un bloque).
- `data-copy-txid` (copiar TXID al portapapeles).  
Evita `onclick=` inline y simplifica mantenimiento.

### 3.3 API Calls
Usar siempre:
```
import { fetchData } from '../core/api.js';
const blocks = await fetchData('/blocks');
```
Evitar concatenar manualmente `window.apiBaseUrl` (ya no existe). Si se necesita `fetch` directo:
```
import { apiBaseUrl } from '../core/config.js';
fetch(`${apiBaseUrl}/utxo-balance/${address}`);
```

### 3.4 Flujo de Transacciones (Coin Control)
`openTransactionModal()`:
1. Carga UTXOs vía `/utxo-balance/:address`.
2. Renderiza checkboxes para inputs.
3. Valida destinatario, monto, passphrase y selección UTXO.
4. Confirma con `showConfirmModal`.
5. Envía con `submitTransaction()`.

### 3.5 Baja de Transacción / BURN
`openBajaTransactionModal()` muestra formulario.  
`submitBajaToken()` envía a `/baja-token` con `{ transactionId, ownerPublicKey, motivo, utxoTxId, utxoOutputIndex }`.  
Integrado BURN directo desde `walletModal` (botón BURN refresca lista UTXO tras éxito).

### 3.6 Verificación QR
`verifyQRProof(qrData)` presenta progreso y resultado con fallback (progress → modal form → modal simple → alert).  
`qrProof.js` ahora importa `verifyQRProof` en lugar de depender de global.

## 4. Eliminaciones y Limpieza
- `fetchData.js` eliminado (legacy).  
- `compat-globals.js` neutralizado en no-op (pendiente borrado definitivo).  
- Removidos `window.MM` y exposición de helpers globales; todo funciona con imports.

## 5. Cómo Añadir una Nueva Feature
Ejemplo: Feature de "Statistics".
1. Crear `public/js/features/statistics.js`.
2. Exportar funciones puras + funciones de UI que usen `safeModal`.
3. Importar en `bootstrap.js` si necesita inicialización en `DOMContentLoaded`.
4. Añadir botón en `view.html` con `id="statisticsBtn"`.
5. En `events/dom.js`, bind condicional:
```
const statsBtn = document.getElementById('statisticsBtn');
if (statsBtn && !statsBtn.dataset.bound) {
  statsBtn.addEventListener('click', () => openStatisticsModal());
  statsBtn.dataset.bound = '1';
}
```

## 6. Próximos Pasos (Pendientes)
- Validación previa baja: GET `/transaction/:id` antes de confirmar baja/BURN.
- Tests Jest para: `bajaToken.js` (success + error) y minería (render sin modal global + modal contextual).
- Eliminar `compat-globals.js` si no se referencia en backups.
- Documentar endpoints y estados esperados (status codes, shape de JSON) para evitar supuestos.

## 7. Troubleshooting Rápido
| Problema | Causa Común | Solución |
|----------|-------------|----------|
| Alert en vez de modal | Falta contenedor DOM del modal | Revisar HTML: `#errorModal` y `#loteModal` presentes. |
| 404 `/undefined/...` | Uso de `window.apiBaseUrl` eliminado | Importar `apiBaseUrl` desde `core/config.js`. |
| Botón sin acción | Falta binding o `dataset.bound` | Ver `events/dom.js` y chequear ID. |
| Modal no cierra | Handler `.close` ausente | Asegurar `span.close` en markup correspondiente. |
| TX sin detalles | Backend no retorna `transaction` | Verificar respuesta en consola y shape esperado. |

## 8. Estándares de Código
- Prefijo de logs: `[TX][MODULE]`, `[events]`, `[walletModal]`, etc.
- Evitar acceso directo a `window.*` salvo casos explícitos: `window.walletAddress` cache.
- Confirmaciones con `showConfirmModal` antes de acciones irreversibles.
- Reutilizar `safeModal` para consistencia UX.

## 9. Ejemplo Mínimo de Feature
```javascript
// public/js/features/statistics.js
import { safeModal } from '../ui/modals.js';
import { fetchData } from '../core/api.js';

export async function openStatisticsModal() {
  const data = await fetchData('/statistics');
  if (data.error) return safeModal('Estadísticas', `<p>Error: ${data.error}</p>`);
  const html = `<h3>📈 Estadísticas</h3><pre>${JSON.stringify(data,null,2)}</pre>`;
  safeModal('Estadísticas Blockchain', html);
}
```

## 10. Conclusión
La migración a ES Modules ha reducido el acoplamiento, clarificado responsabilidades y preparado el frontend para pruebas y extensiones más seguras. Cualquier nueva funcionalidad debe seguir estos patrones para mantener la coherencia y escalabilidad.

---
Última actualización: migración completa y limpieza de legacy (fecha aproximada). Añadir fecha real si se requiere auditoría.
