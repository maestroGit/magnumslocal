# Documentación: Creación y Evolución de la Dirección Burn

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
Para mejorar la robustez, se centralizó la definición de motivos y sufijos en una constante JavaScript:

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
- Consistencia entre frontend, backend y lógica de negocio.
- Facilidad de mantenimiento y ampliación.
- Robustez ante cambios en el frontend.
- Posibilidad de gestión dinámica desde backend o base de datos.

---

**Última actualización:** 26/01/2026
