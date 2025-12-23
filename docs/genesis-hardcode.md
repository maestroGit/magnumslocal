# Proceso de Hardcode del Bloque Génesis en magnumslocal
**Última actualización:** diciembre 2025

Este documento describe el procedimiento para fijar (hardcodear) los datos del bloque génesis en el código de magnumslocal, asegurando que todos los nodos de la red compartan exactamente el mismo bloque inicial y puedan sincronizarse correctamente.

## ¿Por qué hardcodear el bloque génesis?
- Garantiza que todos los nodos tengan la misma cadena desde el inicio.
- Evita inconsistencias por wallets distintas o generación dinámica del génesis.
- Es el enfoque estándar en blockchains públicas como Bitcoin y Ethereum.

## Datos necesarios del bloque génesis
Para fijar el bloque génesis, necesitas recopilar y definir en el código los siguientes datos:

- **timestamp**: Fecha/hora exacta de creación del bloque génesis.
- **hash**: Hash del bloque génesis (opcional, pero recomendable para validación).
- **previousHash**: Usualmente "0" o el valor que uses por convención.
- **nonce**: Valor de nonce usado en el bloque génesis.
- **dificultad (difficulty)**: Dificultad inicial de minado.
- **transacciones/data**: Información de la transacción de génesis, incluyendo:
  - Dirección de recompensa (publicKey)
  - Monto inicial (amount)
  - Otros campos relevantes según tu implementación

## Pasos para extraer los datos del bloque génesis
1. Arranca el nodo relay original y asegúrate de que la cadena se haya generado correctamente.
2. Obtén el bloque génesis:
   - Usando el endpoint `GET /blocks` y tomando el primer bloque.
   - O revisando el archivo de persistencia de la blockchain, si existe.
   - O consultando los logs de arranque del nodo relay.
3. Copia los valores de los campos mencionados arriba.

## Modificación del código
1. Abre el archivo donde se define la creación del bloque génesis (usualmente en la clase `Blockchain`).
2. Sustituye la generación dinámica por la definición fija de los datos extraídos.
3. Asegúrate de que todos los nodos usen exactamente estos datos al crear el bloque génesis.
4. Elimina cualquier dependencia de la wallet local para la creación del génesis.

## Consideraciones
- Si cambias el bloque génesis, todos los nodos deben actualizarse y reiniciar la cadena.
- No incluyas claves privadas en el código, solo la dirección pública de recompensa.
- Documenta los datos fijos y el motivo del cambio para futuras referencias.

## Valores fijos del bloque génesis (consenso)

- **timestamp**: 1738879340000
- **previousHash**: 0000000000000000000000000000000000000000000000000000000000000000
- **hash**: 000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f
- **publicKey (recompensa)**: 04b2201e73f77a7fb6a1bbd401cb1ab128bb5128d69ee5f33c5e6657e4609c4ffb17d2abc868e3d3073f2c64d0e14d943e878b9c58d008fc37c441af8db5f45adb
- **amount**: 500
- **id transacción**: init-fund-1
- **nonce**: 0
- **difficulty**: 0

Estos valores están hardcodeados en `src/block.js` y deben ser idénticos en todos los nodos para asegurar el consenso.

## Pasos de validación tras el cambio

1. Arranca varios nodos desde cero (sin wallet_default.json ni bloques previos).
2. Llama a `GET /blocks` en cada nodo y verifica que el primer bloque (génesis) es idéntico en todos.
3. Comprueba que los nodos pueden sincronizarse y formar una sola red.
4. Si algún nodo genera un génesis diferente, revisa que el código y los valores fijos coincidan exactamente.

---

Actualizado: diciembre 2025


Exacto. En desarrollo, si reinicias el relay y quieres evitar inconsistencias o “herencia” de datos históricos, también debes reiniciar (o limpiar) los nodos conectados. Así todos parten del mismo estado inicial y no hay cadenas, UTXOs o wallets antiguas que puedan causar conflictos.

Si solo reinicias el relay y los nodos mantienen su cadena anterior, pueden propagar una cadena más larga y el relay la adoptará, heredando el historial previo.

Resumen:

Si quieres un entorno limpio, reinicia relay y nodos, y elimina archivos de persistencia si existen.
Si solo reinicias el relay, los nodos pueden “resucitar” la cadena anterior.


