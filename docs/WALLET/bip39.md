1. La Semilla Mnemónica (BIP39)
Antes de llegar a bitcoinjs-lib, el sistema necesita generar el "secreto inicial". Para ello se utiliza normalmente la librería bip39. El código suele verse así:

    const bip39 = require('bip39');

    // 1. Generar las 12 o 24 palabras (Mnemonic)
    const mnemonic = bip39.generateMnemonic(); 

    // 2. Convertir las palabras en una semilla binaria (Seed)
    const seed = await bip39.mnemonicToSeed(mnemonic);

2. Creación de la Raíz HD (BIP32)
Una vez que se tiene la semilla binaria, se utiliza la librería bip32 (que hoy en día está separada de la librería principal pero pertenece al mismo ecosistema de BitcoinJS) para crear el nodo raíz (Master Node).

    const { BIP32Factory } = require('bip32');
    const ecc = require('tiny-secp256k1'); // O los bindings nativos en C que uses
    const bip32 = BIP32Factory(ecc);

    // Crear la clave raíz jerárquica
    const root = bip32.fromSeed(seed);
3. Derivación de Rutas (BIP44)
Aquí es donde entra en juego el estándar BIP44, que define una estructura de rutas fija para que cualquier billetera sepa cómo organizar sus cuentas. La ruta estándar es:
m / purpose' / coin_type' / account' / change / address_index

Para Bitcoin (Mainnet), el coin_type es 0'. Si el proyecto magnumsmaster reutiliza esta infraestructura para firmar la procedencia de activos (como las botellas Magnum), el código derivará claves hijo de forma secuencial:

    // Derivar la ruta para la primera dirección de la cuenta 0
    // m / 44' / 0' / 0' / 0 / 0
    const path = "m/44'/0'/0'/0/0";
    const child = root.derivePath(path);

    // Obtener la clave privada y pública del nodo hijo
    const privateKey = child.privateKey;
    const publicKey = child.publicKey;

4. Generación de Direcciones con bitcoinjs-lib
Finalmente, la librería principal bitcoinjs-lib toma esa clave pública derivada y la envuelve en el formato de dirección que requiera el sistema, ya sea Legacy, SegWit (p2wpkh) o Taproot (p2tr):

    const bitcoin = require('bitcoinjs-lib');

    const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey });
    console.log(`Dirección generada: ${address}`);

¿Por qué es crítico que esté ahí?
El uso de este estándar en el módulo /wallet de tu proyecto garantiza algo fundamental: la recuperabilidad y la interoperabilidad.

Si un usuario o un nodo del sistema genera sus claves para firmar las transacciones o registrar la custodia de los activos en magnumsmaster, no depende de que tu software exista para siempre. Al estar basado en BIP32/BIP44, si el día de mañana necesita exportar su identidad criptográfica, bastará con que introduzca sus 12 palabras en cualquier software estándar del mercado (como Electrum o Sparrow) para recuperar el control total de sus claves privadas y sus firmas.

---------

⚡ SegWit (Segregated Witness) — refresco express
🧩 Qué es
SegWit (Segregated Witness) es una actualización del protocolo de Bitcoin activada en 2017 que separa la firma (witness) del resto de los datos de la transacción.

En una transacción clásica (no‑SegWit), todo va junto:

inputs

outputs

firmas (que ocupan mucho espacio)