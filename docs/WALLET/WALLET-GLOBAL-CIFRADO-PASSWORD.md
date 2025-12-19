## Plan: Cifrado y password para la wallet global del servidor

Implementar protección por password para la wallet global (`wallet_default.json`) en magnumsmaster, de modo que la clave privada esté cifrada y solo pueda ser usada si se proporciona la passphrase correcta al arrancar el servidor o desde el dashboard.

### Steps
1. **Elegir método de cifrado:**
   - Usar AES-GCM o AES-256-CBC (Node.js `crypto`).
   - Derivar la clave de cifrado desde la passphrase con PBKDF2 o scrypt.

2. **Añadir herramienta de cifrado en el dashboard:**
   - Incluir un nuevo div de la clase `dashboard-card` en el dashboard principal.
   - Permitir al usuario seleccionar/cargar un archivo wallet, introducir una passphrase y cifrar/descifrar la wallet desde la interfaz web.
   - Permitir descargar el wallet cifrado o subirlo al backend para operar como bodega.

3. **Modificar la generación de wallet global:**
   - Al crear una nueva wallet, permitir cifrarla desde el dashboard antes de usarla.
   - Guardar el archivo con `{ publicKey, encryptedPrivateKey, salt, iv }`.

4. **Modificar la carga de wallet global:**
   - Permitir cargar la wallet global cifrada desde el dashboard, solicitando la passphrase.
   - El backend descifra y usa la wallet para firmar operaciones de bodega.

5. **Actualizar la documentación:**
   - Explicar el nuevo flujo: la wallet global puede cifrarse/cargarse manualmente desde el dashboard.
   - Documentar cómo migrar o cambiar la wallet global desde la interfaz web.

6. **(Opcional) Script de migración:**
   - Proveer un script o herramienta web para cifrar wallets existentes sin password.

### Further Considerations
1. ¿Prefieres que la wallet global solo se cargue desde el dashboard, o mantener también la carga automática al arrancar?
2. ¿Quieres permitir cambiar la wallet global en caliente (sin reiniciar)?
3. ¿Qué nivel de seguridad necesitas para el endpoint de carga de wallet (autenticación, logs, etc.)?

## EVOLUCIÓN WALLETS
## Transición a formatos estándar (P2PKH, P2SH, Bech32)

La transición a formatos estándar (P2PKH, P2SH, Bech32) sí requiere cambios en la lógica de tu sistema.

Motivos:

Las direcciones estándar no son la clave pública completa, sino una versión codificada (hash160, base58, bech32).
Tendrías que modificar cómo se generan, almacenan y validan las direcciones.
El proceso de firma y verificación seguiría usando la clave pública, pero la correspondencia entre dirección y clave pública ya no sería directa.
El backend y frontend deberían decodificar la dirección para obtener la clave pública antes de validar firmas o transacciones.
Ventajas:

Más seguridad y privacidad (las direcciones no revelan la clave pública completa).
Compatibilidad con otros sistemas y wallets.
En resumen: sí hay que adaptar la lógica de generación, validación y manejo de direcciones, pero la seguridad mejora.

En magnumsmaster estás usando direcciones basadas directamente en la clave pública en formato hexadecimal sin ningún tipo de codificación adicional (ejemplo: empieza por 04 y tiene 130 caracteres hex). Esto corresponde al formato "raw public key" (clave pública sin codificar), no a los formatos estándar de Bitcoin como P2PKH, P2SH o Bech32.

En Bitcoin:

P2PKH: dirección base58, empieza por 1, derivada de hash160 de la clave pública.
P2SH: dirección base58, empieza por 3, derivada de hash160 de un script.
Bech32: dirección codificada en bech32, empieza por bc1, derivada de testigos (segwit).
Tu sistema usa la clave pública completa (130 caracteres hex, prefijo 04), lo que es típico en sistemas de demo, testnet, o blockchains personalizadas, pero no en Bitcoin mainnet.

Sí, en Bitcoin y otras criptomonedas, los formatos de dirección estándar (P2PKH, P2SH, Bech32) se derivan indirectamente de la seed phrase (frase semilla).

El proceso es:

La seed phrase (BIP39) se convierte en una clave maestra (BIP32).
De la clave maestra se derivan claves privadas y públicas (BIP44).
Las claves públicas se procesan (hash, codificación) para generar direcciones en formato P2PKH, P2SH, Bech32, etc.
En tu sistema, la clave pública se usa directamente como dirección, sin codificación adicional. En Bitcoin, la dirección es una representación codificada y comprimida de la clave pública derivada de la seed phrase.

- En formatos estándar (P2PKH, P2SH, Bech32) sería posible tener un listado de claves públicas reservadas para bodega (por ejemplo, en un archivo de configuración o variable global) y comparar el recipient con esa lista. Pero si, las direcciones estándar no son la clave pública completa, sino una versión codificada (hash160, base58, bech32) la comprobación sería posible ?
La comprobación sigue siendo posible, pero el proceso cambia:
En formatos estándar (P2PKH, P2SH, Bech32), la dirección es una codificación (hash) de la clave pública.
Para comparar si un recipient es una dirección reservada (bodega), debes:
Mantener la lista de claves públicas reservadas.
Calcular la dirección estándar (P2PKH, P2SH, Bech32) de cada clave pública reservada usando el mismo algoritmo que tu sistema.
Comparar el recipient con la lista de direcciones generadas.
No puedes comparar directamente la clave pública con la dirección, pero sí puedes generar la dirección a partir de la clave pública y hacer la comparación. Así funciona en Bitcoin y sistemas compatibles.


## como proceder en el caso de BURN. Sería más eficiente, tener publicskey, direcciones basadas directamente en la clave pública en formato hexadecimal sin ningún tipo de codificación adicional (ejemplo: empieza por 04 y tiene 130 caracteres hex) como ahora para poder comparar con un listado de claves públicas reservadas para bodega (por ejemplo, en un archivo de configuración o variable global) y comparar el recipient con esa lista. Y mantener el tipo de direcciones formatos estándar (P2PKH, P2SH, Bech32), con la dirección como resultado de la codificación (hash) de la clave pública. Así se refuerza la trasacciones que mantiene UTXOs vivos de las que "queman UTXO". ¿que te parece?

Tu planteamiento es válido y tiene sentido técnico:

Usar claves públicas completas (hex, prefijo 04) para direcciones especiales como BURN/bodega facilita la comparación directa y la gestión de UTXOs especiales, ya que puedes identificar sin ambigüedad si un output es para una clave reservada.
Mantener formatos estándar (P2PKH, P2SH, Bech32) para usuarios normales refuerza la privacidad y compatibilidad, y separa claramente los flujos de usuario y de sistema.
Ventajas de tu enfoque:

La lógica de comparación para BURN/bodega es directa y eficiente.
Las transacciones de usuario siguen las mejores prácticas de seguridad y privacidad.
Puedes distinguir fácilmente entre UTXOs "vivos" y "quemados" por el tipo de dirección.
Consideraciones:

Documenta bien la convención para evitar confusiones futuras.
Asegúrate de que el backend y frontend manejen ambos tipos de dirección correctamente.
Si en el futuro quieres migrar todo a formatos estándar, tendrás que mapear las claves públicas reservadas a sus direcciones codificadas.
En resumen: tu propuesta es eficiente y práctica para tu caso de uso, y refuerza la trazabilidad de UTXOs especiales sin sacrificar la seguridad de los usuarios.

No es la estructura más rápida para búsquedas directas por clave pública, pero es suficientemente eficiente para pocos elementos.

Un array de objetos requiere recorrer el array para buscar una clave pública (O(n)).
Si necesitas máxima velocidad para búsquedas frecuentes y tienes muchas bodegas, lo óptimo sería un objeto (diccionario) con la clave pública como key:

{
  "04a1b2c3...": { "bodega": "bodega1" },
  "04f1e2d3...": { "bodega": "bodega2" },
  "04abcdef...": { "bodega": "bodega3" }
}

Así, la búsqueda por clave pública es O(1). Para pocos elementos, la diferencia es mínima, pero para escalabilidad y acceso rápido, el diccionario es mejor.

Perfecto, esa estructura tipo diccionario es ideal para tu caso:

Permite búsquedas rápidas por clave pública.
Facilita mostrar el listado de nombres de bodegas en el frontend.
Puedes autocompletar la dirección BURN al seleccionar la bodega.
Solo asegúrate de mantener la clave pública como key y el nombre de la bodega como valor/objeto. Así, la integración frontend-backend será eficiente y clara. ¿Necesitas ayuda para la lógica de autocompletado en el frontend?