# Documentación: Creación y Evolución de la Dirección Burn
Última actualización: 26/01/2026

## Introducción
La dirección "burn" se utiliza para enviar tokens a un destino especial donde se consideran eliminados o fuera de circulación. Este documento describe cómo se construye la dirección burn en el sistema, su evolución y las mejores prácticas para su gestión.

## 1. Construcción Inicial de la Dirección Burn
Originalmente, la dirección burn se construía concatenando una base fija con un sufijo que representaba el motivo de la quema. Por ejemplo:

```
0x0000000000000000000000000000000000000000BODEGA
```

El sufijo (por ejemplo, `BODEGA`) se obtenía directamente del valor seleccionado en el HTML (`<option value="bodega">`).

## 2. Problemas de Robustez
Esta aproximación dependía de los valores del HTML, lo que podía llevar a inconsistencias si se modificaban los valores o etiquetas en el frontend sin actualizar la lógica de construcción de la dirección.

## 3. Refactorización: Mapeo Centralizado en JavaScript
## 3. Refactorización v1: Mapeo Centralizado en JavaScript (Enero 2026)
Se centralizó la definición de motivos y sufijos en una constante JavaScript:

```js
const BURN_MOTIVES = {
  burn:    { label: 'Burn (Genérico)',    suffix: 'BURN' },
  pierola: { label: 'Fernández de Piérola', suffix: 'PIEROLA' },
  traslascuestas: { label: 'Traslascuestas',     suffix: 'TRASLASCUESTAS' }
};
```

La dirección burn se construye así:

```js
const motiveObj = BURN_MOTIVES[motivo] || { suffix: motivo.toUpperCase() };
const burnAddress = '0x0000000000000000000000000000000000000000' + motiveObj.suffix;
```

El select de motivos se rellena dinámicamente a partir de este mapeo, garantizando consistencia entre la UI y la lógica de negocio.

## 3.1. Refactorización v2: Carga Dinámica desde Base de Datos (Marzo 2026)
Para mejorar la escalabilidad, se implementó la carga dinámica de bodegas desde el endpoint `/users?role=winery`:

```js
// Al cargar la página, se ejecuta:
async function loadBodegas() {
  try {
    const res = await fetch('/users?role=winery', { credentials: 'include' });
    if (!res.ok) return;
    
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      // Construir BURN_MOTIVES dinámicamente
      BURN_MOTIVES = {
        burn: { label: 'Select Cellar', suffix: 'BURN' } // Fallback
      };
      
      data.data.forEach(bodega => {
        BURN_MOTIVES[bodega.id] = {
          label: bodega.nombre,
          suffix: bodega.id.toUpperCase().slice(0, 20) // Limitar a 20 caracteres
        };
      });
    }
  } catch (error) {
    console.error('[BODEGAS] Error:', error);
  }
  
  // Poblar select dinámicamente
  if (reasonSelect) {
    reasonSelect.innerHTML = '';
    Object.entries(BURN_MOTIVES).forEach(([value, { label }]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      reasonSelect.appendChild(opt);
    });
  }
}

// Se ejecuta al iniciar
await loadBodegas();
```

**Ventajas v2**:
- Las bodegas se gestionan 100% desde la BD (tabla `users` con `role='winery'`).
- El sufijo del burn address usa el `id` de la bodega: `bodega_id.toUpperCase()`.
- No requiere redeploy del frontend al agregar/editar bodegas.
- Escalable: soporta N bodegas sin modificar código.

**Construcción del burn address con v2**:
```js
const motiveObj = BURN_MOTIVES[bodega_id] || { suffix: 'BURN' };
const burnAddress = '0x0000000000000000000000000000000000000000' + motiveObj.suffix;
// Ejemplo: 0x0000000000000000000000000000000000000000BODEGA-001
```

## 5.5. Flujo Completo de una Transacción de Burn (v2)
Cuando el usuario accede a `consume-keystore.html`:

1. **Carga de Bodegas** (al iniciar):
  - Se ejecuta `loadBodegas()` → `GET /users?role=winery`
  - Respuesta: `{ success: true, data: [{ id: "bodega-001", nombre: "Bodega 1", ... }, { id: "1772712102085", nombre: "Bodega Email", ... }, ...] }`
  - Se construye dinámicamente: `BURN_MOTIVES["bodega-001"] = { label: "Bodega 1", suffix: "BODEGA-001" }`
  - Se construye dinámicamente: `BURN_MOTIVES["1772712102085"] = { label: "Bodega Email", suffix: "_1772712102085_" }`
  - El select `#burnReason` se rellena automáticamente.

2. **Usuario Selecciona Bodega**:
  - Usuario hace click en el select y elige, por ejemplo: "Bodega Email" (con `value="1772712102085"`)

3. **Usuario Firma y Envía**:
  - Usuario introduce passphrase y hace click en "Opened"
  - Se valida que el UTXO es del usuario.
  - Se descifra la clave privada localmente.
  - Se construye el output del burn:
    ```js
    const motiveObj = BURN_MOTIVES["1772712102085"]; // { label: "Bodega Email", suffix: "_1772712102085_" }
    const burnAddress = '0x0000000000000000000000000000000000000000' + "_1772712102085_";
    // Resultado: "0x0000000000000000000000000000000000000000_1772712102085_"
    ```

4. **Transacción Firmada Enviada a Mempool**:
  - `POST /transaction` con:
    ```json
    {
     "signedTransaction": {
      "id": "591b22f31f4e3c1d514b6c6f60a1dde509943b364f646491b03201ce98fd8427",
      "inputs": [...],
      "outputs": [
        { "amount": 100, "address": "0x0000000000000000000000000000000000000000_1772712102085_" }
      ]
     },
     "origin": "1772712102085",
     "type": "quemada"
    }
    ```

5. **Backend laDetecta como Burn**:
  - La dirección comienza con `0x0000000000000000000000000000000000000000`, así que es tipo `"opened"`.
  - Se almacenan `origin` y `type`.
  - Se agregará a la mempool.

6. **En el Historial Aparece**:
  ```
  Opened | 100💰 | 🍾0x0000000000000000000000000000000000000000_1772712102085_ | Pendiente
  ```
  - El frontend muestra la dirección completa con el suffix.
  - Si hay minado, se actualiza a `"Mined"`.

## 4. Lógica Backend: Detección y Propagación de Burns
Desde enero 2026, el backend refuerza la robustez de la detección de quemadas:

- Si la transacción recibida tiene un output con dirección que **comienza** por `0x0000000000000000000000000000000000000000` (con o sin sufijo), el backend la detecta como operación de tipo `opened` (antes: `quemada`).
- El campo `origin` (nombre de la bodega/motivo) también se propaga si se recibe en el payload.
- Ambos campos (`type` y `origin`) se almacenan y devuelven en la respuesta, la mempool y el historial, permitiendo al frontend filtrar y mostrar correctamente las quemadas y su motivo.
- El backend espera `type: "quemada"` en la petición a `/baja-token`, pero devuelve `type: "opened"` en el historial para coherencia visual con el frontend.

### Ejemplo de transacción quemada en la respuesta del backend:

```json
{
  "transactionId": "...",
  "type": "opened",
  "origin": "pierola",
  "...otrosCampos"
}
```

Esto garantiza que cualquier lógica de filtrado o visualización en el frontend sea robusta y coherente, independientemente de cómo se construya la dirección en el cliente.

## 5. Resumen de Ventajas
## 5. Resumen de Ventajas

**v1 (Mapeo Centralizado en JavaScript)**:
- Consistencia entre frontend, backend y lógica de negocio.
- Facilidad de mantenimiento respecto a hardcoded HTML.
- Robustez ante cambios en valores del select.

**v2 (Carga Dinámica desde BD)**:
- Gestión centralizada de bodegas: todas las bodegas en la BD se cargan automáticamente.
- Escalabilidad: agregar nuevas bodegas sin modificar ni redeploy del frontend.
- Consistencia total: el sufijo del burn address siempre refleja el `id` actual de la bodega en BD.
- Robustez ante cambios de datos: cambiar nombre o ID de bodega se refleja inmediatamente en el frontend.
- Posibilidad de filtros, gestión de permisos y auditoría centralizada en backend.

---

**Última actualización:** 19/03/2026
