# Summary de wallet_utxo_summary

## Que es esta tabla

`wallet_utxo_summary` es una tabla de resumen derivado por wallet.
No es la fuente historica de verdad de la blockchain.

Su objetivo es exponer un estado compacto y rapido para frontend:

- utxos_disponibles
- balance_disponible
- utxos_pendientes
- balance_pendiente
- updated_at

## De donde sale la verdad

La verdad historica sigue estando en:

- bloques
- transacciones
- UTXOs confirmados en cadena
- estado dinamico del mempool

El summary es solo una vista agregada de ese estado.

## Por que aparecia el desfase

El desfase ocurria porque el endpoint de summary podia devolver un snapshot persistido desactualizado.

Cuando habia movimiento en mempool (gastos pendientes o outputs pendientes), el estado runtime cambiaba, pero la fila guardada podia no reflejar ese cambio en ese momento.

Resultado:

- runtime UTXO y summary podian divergir
- frontend mostraba valores distintos segun endpoint

## Cambio aplicado

Se ha ajustado el endpoint `GET /wallet/:address/utxo-summary` para:

1. Recalcular en cada lectura desde runtime.
2. Incluir logica de mempool para separar:
   - disponibles
   - pendientes
3. Persistir el resultado actualizado en `wallet_utxo_summary` en cada lectura.

Esto reduce el desfase operativo entre lo que se consulta y lo que se muestra.

## Impacto sobre historico

Este cambio no sobreescribe el historico blockchain.

Solo actualiza una tabla de resumen derivado.

Si se necesita auditoria temporal de evolucion del saldo, eso debe ir en una tabla de eventos historica separada, no en `wallet_utxo_summary`.

## Nota de arquitectura

- Historico: inmutable, auditable, basado en bloques/transacciones.
- Summary: mutable, recalculable, optimizado para lectura rapida.
