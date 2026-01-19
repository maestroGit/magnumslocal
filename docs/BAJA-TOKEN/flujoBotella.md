## Plan: Concatenar motivo al final de la dirección burn
Para que el motivo de baja se incluya como sufijo en la dirección de destino del output, debes modificar la línea donde se define burnAddress y construir el output usando ese valor concatenado.

Steps
Modificar la línea donde se define burnAddress para concatenar el motivo:
Usar: const burnAddress = '0x0000000000000000000000000000000000000000' + motivo.toUpperCase();
Asegurarse de que el output use la nueva variable burnAddress:
La línea: const outputs = [{ amount: Number(selectedUTXO.amount), address: burnAddress }];
Verificar que el motivo esté en mayúsculas y sin espacios para mantener formato blockchain.

# 🍷 VINUM Token – Transferible y Redimible

## 🛒 Compra (off-chain)
1. Usuario ALICE paga a la bodega (fiat). // Landing page con links a bodegas y código de referidos o venta directa enlazada a bodega
2. La bodega emite un `VINUM Token` y lo transfiere a la wallet pública de Alice.

## 🔁 Transferencia (on-chain)
3. Usuario ALICE transfiere el token a Usuario BOB (regalo o venta).
4. El contrato registra el nuevo `owner`.

## 🔥 Redención (on-chain)
5. Usuario BOB firma una transacción y envía el token a la `burn_wallet` de la bodega.
6. El contrato marca el token como `redeemed = true`.
7. La bodega entrega la botella física.

## 📜 Legal

## 🧠 Branding


![Flujo circular de la botella](../src/images/circularFlowDiagra.png)

## Invarianza del contrato simple: usar tx.id como identidad de emisión

Para evitar confusiones futuras dejamos explícito el contrato sencillo que seguimos hoy:

- Supuesto/Condición: al crear (emitir) un lote se genera exactamente un único output en la transacción que contiene el lote (metadatos del lote).
- Consecuencia práctica: bajo esa condición es seguro usar el identificador de la transacción (`tx.id`, el hash de la transacción) como la "identidad de emisión" del lote.

Esto quiere decir que en todo el sistema se podrá referenciar un lote por `loteId = tx.id` siempre que la transacción de emisión cumpla la regla "un output por lote".

Recomendaciones y advertencias:
- Antes de aceptar una emisión, el servicio emisor debe validar que `tx.outputs.length === 1` y que ese único output incluye los metadatos del lote.
- Si en el futuro se permite que una transacción genere varios outputs con distintos lotes, entonces NO será seguro usar `tx.id` como identidad única. En ese caso la identidad debe ser (txId, outputIndex) o introducir un índice off‑chain que mapee lote -> (txId, outputIndex).
- Para migraciones, introducir un `loteIndex` persistente que guarde { loteId, txId, outputIndex, owner, timestamp } facilitará consultas y compatibilidad sin romper el contrato simple.

Ejemplo (conceptual):
```json
// emisión válida (1 output)
{
	"id": "abcd...",
	"outputs": [ { "address": "ADDR_BODEGA", "amount": 1, "meta": { "lote": "L-2025-001" } } ]
}
// en este caso: identidad del lote = "abcd..."
```

