# Flujo de Mempool: Magnumslocal y Relay

**2. Sincronización de mempool al conectar como peer:**
- Cuando magnumslocal se conecta y recibe una cadena más larga, actualiza la blockchain y limpia su mempool de transacciones ya minadas.
- Las transacciones pendientes que no están en la nueva cadena permanecen en la mempool.

**3. Estado de la mempool tras sincronización:**
- Si magnumslocal no tenía transacciones propias, su mempool queda vacía tras sincronizar.
- Las transacciones pendientes suelen estar en la mempool del relay.
- magnumslocal no recibe automáticamente las transacciones pendientes del relay, solo si el relay las envía explícitamente.

**4. Propagación de transacciones:**
- magnumslocal solo tendrá las transacciones pendientes del relay si está conectado y las recibe por broadcast.
- Si magnumslocal está desconectado, no recibe las nuevas transacciones y su mempool queda desactualizada.
- Al reconectarse, solo se actualizará si el relay le envía las transacciones pendientes.

**5. Comportamiento correcto:**
- El relay hace broadcast de transacciones individuales, no de la mempool completa.
- Cada peer gestiona su mempool de forma independiente y solo recibe las transacciones mientras está conectado.
- Este comportamiento es estándar en redes blockchain.

---

**¿Mejoras posibles?**
- Se podría implementar una sincronización de mempool al reconectar, pero el broadcast individual es el método más eficiente y seguro.

---

*Documento generado automáticamente a partir de la conversación sobre el flujo de mempool en magnumslocal y relay.*
