en tu sistema el premio de minado se crea como una transacción coinbase (inputs vacíos, outputs con el premio para el minero). Actualmente, el premio no tiene límite ni reducción automática: cada bloque minado genera el mismo monto (por ejemplo, 50 unidades).

Si quieres implementar un límite o reducción progresiva del premio (como en Bitcoin), puedes hacerlo de dos formas:

1. Límite total de monedas: Llevar un contador global de monedas emitidas y dejar de crear premios cuando se alcance el máximo.
2. Reducción por bloque (halving): Disminuir el premio cada cierto número de bloques (por ejemplo, cada 100,000 bloques el premio se reduce a la mitad).
Esto se controla en la lógica de creación de la transacción coinbase, normalmente en el método de minado del bloque (por ejemplo, en la clase Miner).

¿Quieres que te ayude a implementar un límite total de monedas, una reducción progresiva (halving), o ambos?

En tu sistema, cuando se mina un bloque y se recibe el premio (por ejemplo, 50 unidades), la transacción de recompensa aparece con los siguientes datos:

"inputs": [] (no hay entradas, es decir, no se gastan UTXOs previos)
"outputs": [{ "amount": 50, "address": ... }] (el premio se asigna a una dirección específica)
Esto corresponde a una transacción tipo coinbase. En blockchains como Bitcoin, la coinbase es la primera transacción de cada bloque y crea nuevas monedas como recompensa para el minero. No tiene entradas, solo outputs.

En tu caso, la dirección que recibe el premio es la del minero que resolvió el bloque. El sistema asigna el premio a la wallet pública del minero activo en ese momento (por ejemplo, la wallet global cargada en el backend).

Resumen:

El premio de minado sale de "la nada" (inputs vacíos), es una coinbase.
La dirección de destino es la del minero (por defecto, la wallet global del backend).
No se gasta ningún UTXO previo, se crean nuevas monedas.
Si quieres ver o cambiar la wallet que recibe el premio, revisa cómo se inicializa el minero en el backend (server.js), normalmente usando la wallet global cargada al arrancar el servidor.

Sí, es una idea muy buena y fácil de implementar. Puedes identificar los UTXOs que provienen de transacciones coinbase (premio de minado, con inputs vacíos) y cambiar el color del div a naranja para diferenciarlos visualmente.

Para hacerlo:

Cuando construyas cada div de UTXO, verifica si el UTXO proviene de una transacción con "inputs": [].
Si es así, añade una clase especial (por ejemplo, coinbase-utxo) al div.
En tu CSS, define .coinbase-utxo { background-color: orange; } para el color naranja.

