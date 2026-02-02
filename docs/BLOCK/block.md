# Documentación de la clase `Block`

## ¿Qué es la clase `Block`?

La clase `Block` representa la unidad fundamental de la blockchain. Cada bloque contiene:
- Un timestamp (marca de tiempo de creación)
- El hash del bloque anterior (`previousHash`)
- Su propio hash (`hash`)
- Los datos o transacciones (`data`)
- Un `nonce` (para la prueba de trabajo)
- La dificultad de minado (`difficulty`)
- El tiempo de procesamiento (`processTime`)

El bloque génesis es el primer bloque de la cadena y es especial porque no tiene bloque anterior.

## Hardcodeo de la publicKey en el bloque génesis

En el método `getGenesisBlock()` de la clase `Block`, la clave pública (`publicKey`) de destino del saldo inicial está **hardcodeada** en los Nodos secundarios (es decir, escrita de forma fija en el código):

```js
const recipientPublicKey = "04b2201e73f77a7fb6a1bbd401cb1ab128bb5128d69ee5f33c5e6657e4609c4ffb17d2abc868e3d3073f2c64d0e14d943e878b9c58d008fc37c441af8db5f45adb";
```

### ¿Por qué es importante este hardcodeo?

- **Consenso entre nodos:** Si cada nodo generara el bloque génesis usando la clave pública de su propia wallet, el contenido y el hash del bloque génesis serían diferentes en cada nodo.
- **Evitar divergencias:** Cuando un nodo recibe una cadena de otro, compara el bloque génesis. Si no son idénticos, rechaza la cadena. El hardcodeo asegura que todos los nodos tengan exactamente el mismo bloque génesis.
- **Sincronización y arranque:** Así, cualquier nodo secundario que arranque desde cero o reciba la cadena de otro, aceptará el bloque génesis como válido y no habrá divergencias en la red.

**En resumen:**
> Hardcodear la publicKey en el bloque génesis es fundamental para garantizar el consenso y la interoperabilidad entre todos los nodos de la red blockchain.

---
_Última actualización: enero 2026_
