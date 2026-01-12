# 🧩 1. ¿Qué ocurre cuando un nodo recibe una transacción?
Cuando un nodo Bitcoin Core recibe una transacción (por un peer o por RPC), sigue este flujo:
1. Verificación preliminar (pre-checks)
Antes de siquiera pensar en el mempool, el nodo verifica:
- Formato correcto
- Firmas válidas (ECDSA/Schnorr)
- No gastar outputs inexistentes
- No gastar outputs ya gastados en la cadena
- Tamaño, fees, nLockTime, nSequence
- Política de mempool (minRelayTxFee, RBF, ancestor/descendant limits…)
Si falla algo → se descarta inmediatamente.
2. Verificación de doble gasto
El nodo revisa:
- ¿Algún input ya está gastado en la blockchain? → rechazo
- ¿Algún input ya está gastado por otra transacción en el mempool? → rechazo o reemplazo (si es RBF)
3. Entrada al mempool
Si pasa todas las reglas → se añade al mempool local del nodo.
Importante:
👉 Cada nodo tiene su propio mempool.
No existe un mempool global.

🛰️ 2. ¿Cómo se propaga una transacción por la red?
Bitcoin usa un protocolo gossip (chismorreo distribuido):
- El nodo anuncia a sus peers: inv(txid)
- Los peers interesados responden: getdata(txid)
- El nodo envía la transacción completa: tx
Cada nodo repite el proceso con sus propios peers.
Esto crea una difusión rápida y redundante, pero cada nodo decide individualmente si acepta o no la transacción.

Los nodos NO leen ni consultan directamente la mempool de otros nodos, pero sí reciben las transacciones que esos nodos aceptan en sus mempools. Esa es la clave.
Los nodos NO comparten su mempool como una base de datos
No existe:
- un endpoint para “leer la mempool de otro nodo”
- un protocolo para sincronizar mempools
- un mecanismo para consultar inputs gastados en mempools ajenos
Cada nodo mantiene su propia mempool local, con sus propias políticas.
Entonces… ¿cómo saben que un input ya está gastado si no está en la blockchain?
Porque todos los nodos reciben las mismas transacciones (o casi todas) a través del protocolo de gossip.
El flujo es así:
- Nodo A recibe una transacción válida → la mete en su mempool
- Nodo A anuncia a sus peers: inv(txid)
- Los peers piden la transacción: getdata(txid)
- Nodo A envía la transacción completa
- Cada peer la valida y, si es válida, la mete en su mempool
- Cada peer repite el proceso con sus propios peers

¿Qué pasa si un nodo recibe una transacción que gasta un input ya gastado en su mempool?
Bitcoin Core hace esto:
- Si la transacción existente NO es RBF → rechaza la nueva
- Si la existente es RBF y la nueva tiene mayor fee → la reemplaza
- Si la nueva es inválida → la descarta
- Si la nueva es válida pero depende de otra que no tiene → la guarda como “orphan” temporalmente
Todo esto ocurre localmente, sin consultar a otros nodos.

¿Y si un nodo no recibió la transacción original?
Puede pasar. La red no es perfecta.
Ejemplo:
- Nodo A recibe TX1 y la mete en su mempool
- Nodo B no la recibe por latencia, desconexión o políticas distintas
- Nodo B recibe TX2 que gasta los mismos inputs
¿Qué hace B?
- Si TX2 es válida según sus reglas → la mete en su mempool
- Cuando más tarde reciba TX1 → la rechazará como doble gasto
Esto demuestra que:
👉 Los mempools no están sincronizados
👉 La red no garantiza que todos los nodos vean todas las transacciones
Pero en la práctica, la propagación es tan eficiente que la mayoría de nodos ven casi todo.

¿Cómo se resuelve definitivamente un doble gasto?
Solo hay una respuesta:
✔️ La blockchain, no el mempool.
Cuando un bloque se mina:
- Se incluyen ciertas transacciones
- Los nodos eliminan del mempool cualquier transacción que gaste inputs ya gastados en ese bloque
- Se descartan todas las transacciones conflictivas
El mempool es solo un buffer temporal.
La cadena es la verdad final

¿Las mempools de dos nodos suelen contener las mismas transacciones?
✔️ Sí, en la mayoría de los casos.
¿Por qué?
Porque cuando un nodo acepta una transacción válida, la propaga a sus peers, y esos peers la propagan a los suyos, y así sucesivamente.
Ese “gossip” hace que la mayoría de transacciones válidas terminen llegando a casi todos los nodos de la red.
Por eso, si consultas:
- la mempool del nodo A
- la mempool del nodo B
…lo normal es que veas un conjunto muy similar de transacciones, aunque hayan llegado por rutas distintas.
¿Tienen que ser idénticas?
❌ No necesariamente.
Hay varias razones por las que pueden diferir:
A. Políticas de mempool distintas
Cada nodo puede configurar:
- minRelayTxFee
- límites de tamaño
- reglas de RBF
- límites de ancestors/descendants
- políticas de relay (por ejemplo, no aceptar transacciones sin fees)
Esto hace que algunos nodos acepten transacciones que otros rechazan.
B. Latencia o pérdida de propagación
La red P2P no garantiza entrega perfecta.
Un nodo puede recibir una transacción antes que otro, o incluso no recibirla nunca.
C. Transacciones huérfanas (orphans)
Un nodo puede recibir una transacción dependiente antes que su padre, y la guarda en un pool separado.
Otro nodo puede recibirlas en orden correcto.
D. Reinicios o limpieza de mempool
Si un nodo se reinicia, su mempool se vacía (a menos que use persistencia opcional).
Otro nodo puede tener un mempool lleno.

¿Qué significa “distinto origen”?
Esto es clave.
✔️ Una transacción puede llegar a un nodo A desde un peer X
✔️ Y al nodo B desde un peer Y
✔️ Pero la transacción es la misma (mismo txid)
La red no tiene un “origen oficial” de una transacción.
Solo tiene propagación.
Bitcoin no rastrea quién creó la transacción ni quién la envió primero.
Solo importa:
- si es válida
- si no es doble gasto
- si cumple las políticas del nodo

🧠 Resumen:
Puedes pensarlo así:
✔️ Cada nodo tiene su propia mempool
✔️ No se sincronizan entre sí
✔️ Pero la propagación P2P hace que se parezcan muchísimo
✔️ Aunque siempre habrá pequeñas diferencias por políticas, latencia o reinicios
Analogía muy precisa:
Imagina que dos personas escuchan la misma noticia a través de diferentes amigos.
- No se llaman entre sí para sincronizar lo que saben
- Pero como la noticia se difunde por muchos canales, ambos terminan sabiendo casi lo mismo
- Aunque uno puede enterarse antes, después o incluso no enterarse de ciertos detalles
Así funciona la mempool.


🔁 3. ¿Cómo se evita que una transacción se duplique?
Hay dos niveles:
A. A nivel de mempool
Cada transacción tiene un identificador único: txid (hash del contenido).
Si un nodo recibe una transacción cuyo txid ya está en su mempool:
- La ignora
- No la reenvía
- No la almacena dos veces
Si recibe otra transacción que gasta los mismos inputs:
- Se rechaza como doble gasto
- O se reemplaza si cumple RBF (Replace-By-Fee)

B. A nivel de blockchain
Una vez una transacción aparece en un bloque válido:
- Se elimina del mempool
- Cualquier transacción que intente gastar los mismos inputs se rechaza automáticamente

⛏️ 4. ¿Quién selecciona las transacciones que se minan?
El minero, no la red.
Cada minero (o pool) ejecuta su propio nodo Bitcoin Core y construye su propio bloque:
- Toma las transacciones de su mempool
- Las ordena por fee rate (satoshis/vByte)
- Respeta límites de tamaño (4M weight units)
- Respeta dependencias (ancestors/descendants)
- Construye el bloque candidato
- Empieza a minarlo (proof-of-work)

🧮 5. ¿Se minan todas las transacciones de todas las mempools?
No.
Y aquí está la clave:
❌ No existe un mempool global
❌ No todos los nodos tienen las mismas transacciones
❌ No todos los mineros ven las mismas transacciones
❌ No todas las transacciones llegan a todos los nodos
✔️ Cada minero mina solo las transacciones que tiene en su propio mempool.
Esto implica:
- Una transacción puede tardar más si no llega a los mempools de los mineros grandes
- Una transacción puede ser minada por un minero que la vio, aunque otros nodos no la tengan
- Las políticas de mempool pueden variar entre nodos (aunque Bitcoin Core tiene defaults comunes)

🧱 6. ¿Qué pasa cuando una transacción se mina?
Cuando un minero encuentra un bloque válido:
- Lo propaga a la red
- Cada nodo valida el bloque
- Si es válido:
- Se añade a la blockchain
- Se eliminan del mempool todas las transacciones incluidas
- Se eliminan también las transacciones que dependían de inputs ya gastados
Esto garantiza que no haya duplicación.


# 🧩 ¿Puede la mempool aceptar dos transacciones que gastan el mismo UTXO?
No.
La mempool de Bitcoin Core rechaza automáticamente cualquier transacción que intente gastar un UTXO ya gastado por otra transacción pendiente.
Esto significa:
- Si tienes un UTXO de 100 unidades…
- Y creas una transacción A que gasta ese UTXO…
- La mempool bloquea ese UTXO.
- Si intentas crear una transacción B que también lo gaste (aunque sea por menos, o aunque la suma no supere 100)…
👉 Bitcoin Core la rechaza como “double spend”.

🧱 ¿Por qué funciona así?
Porque en Bitcoin un UTXO solo puede gastarse una vez, y la mempool actúa como un “pre-consenso” para evitar que nodos y mineros pierdan tiempo procesando transacciones inválidas.
La mempool mantiene un estado temporal de UTXOs gastados por transacciones pendientes.
Si una transacción usa un UTXO, ese UTXO queda marcado como gastado hasta que:
- la transacción se mina (y entonces se generan los nuevos UTXOs), o
- la transacción expira o se elimina de la mempool.

🔄 ¿Hay alguna excepción?
Sí, pero no aplica a tu caso normal:
✔️ Replace-By-Fee (RBF)
Puedes enviar otra transacción que gaste el mismo UTXO solo si:
- la transacción original marcó nSequence para permitir RBF, y
- la nueva transacción paga una comisión mayor.
Pero esto no es “usar el mismo UTXO dos veces”, sino reemplazar la transacción anterior.
✔️ Child-Pays-For-Parent (CPFP)
No gasta el mismo UTXO, sino que gasta un UTXO creado por una transacción pendiente.

🧠 Comparación con tu blockchain
Lo que describes:
- Seleccionas un UTXO de 100.
- Creas una transacción de 20.
- Mientras está pendiente, no puedes volver a usar ese UTXO.
- Cuando se mina, aparece el UTXO de cambio y ya puedes usarlo.
👉 Esto es exactamente igual que Bitcoin Core.
La única diferencia es que Bitcoin Core permite RBF, pero eso no cambia la regla fundamental:
no puedes tener dos transacciones simultáneas gastando el mismo UTXO.


