# Sincronización de Conexiones y Mempool en Magnumslocal

## Escenario

En una red blockchain con nodos tipo relay y secundarios (por ejemplo, magnumslocal), es fundamental que la mempool (pool de transacciones pendientes) se mantenga sincronizada entre todos los nodos para evitar que se mine una transacción ya confirmada en otro nodo.

## Problema Detectado

- Cuando el relay mina un bloque, vacía su mempool y envía un mensaje `CLEAR_TRANSACTIONS` a sus peers.
- Si magnumslocal (nodo secundario) no recibe este mensaje, su mempool no se vacía y puede volver a minar transacciones ya confirmadas.
- Esto ocurre si el relay no tiene al secundario en su lista de sockets conectados (por ejemplo, por un problema de red, configuración o NAT).

## Diagnóstico

- Si los bloques se sincronizan pero la mempool no, es probable que la conexión P2P sea unidireccional: el secundario recibe la cadena, pero el relay no puede enviarle mensajes broadcast.
- El mensaje `CLEAR_TRANSACTIONS` no llega si el relay no tiene una conexión WebSocket activa hacia el secundario.

## Requisitos de Red

- **En red local (LAN):** Basta con usar la IP local y el puerto del secundario en la variable `PEERS` del relay.
- **Desde fuera de la red (WAN):** Es necesario configurar port forwarding (NAT) en el router para que el puerto externo apunte al puerto interno del PC donde corre magnumslocal.
- El firewall del PC debe permitir conexiones entrantes al puerto usado por el WebSocketServer.

## Ejemplo de Configuración

En el archivo `.env` del relay:

```
PEERS=ws://IP_DEL_MAGNUMSLOCAL:PUERTO
```

- Si magnumslocal está en la misma red local: usa la IP local (ej: `192.168.1.100`).
- Si está fuera (internet): usa la IP pública y asegúrate de tener port forwarding configurado.

## Pasos para Diagnóstico y Solución

1. Verifica que ambos nodos tienen la IP:puerto del otro en su variable `PEERS`.
2. Revisa los logs de arranque para confirmar que ambos nodos se conectan como peers.
3. Si el mensaje `CLEAR_TRANSACTIONS` no llega, revisa la configuración de red y el port forwarding.
4. Usa logs en el handler de mensajes para confirmar la recepción y vaciado de la mempool.

## Resumen


## Estrategia Alternativa: Vaciado de Mempool tras Sincronización de Cadena

Para simplificar la gestión de nodos en despliegues geográficos y evitar depender de la bidireccionalidad de los sockets o la configuración de red, se puede implementar una estrategia robusta:

- Cuando un nodo detecta que su cadena local ha cambiado (por ejemplo, al recibir y validar un bloque nuevo de otro nodo mediante `replaceChain`), debe comparar las transacciones de los nuevos bloques con su mempool.
- Todas las transacciones que ya han sido incluidas en la nueva cadena deben eliminarse de la mempool local.
- Así, aunque falle la comunicación directa de `CLEAR_TRANSACTIONS`, la mempool se mantiene limpia y consistente tras cada sincronización de cadena.

**Ventajas:**
- No dependes de la bidireccionalidad de los sockets ni de la topología de red.
- Simplifica despliegues geográficos y reduce problemas de NAT/firewall.
- Es robusto ante caídas o reconexiones de nodos.

**Implementación típica:**
- Cuando se recibe y valida una nueva cadena (por ejemplo, en `replaceChain`), recorre los bloques nuevos y elimina de la mempool todas las transacciones que ya estén minadas.

Esta estrategia puede convivir con el broadcast de `CLEAR_TRANSACTIONS` y aporta una capa extra de robustez a la red.
