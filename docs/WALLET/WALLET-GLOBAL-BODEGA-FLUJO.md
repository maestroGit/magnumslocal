## Flujo preciso de generación y carga de la wallet global en magnumsmaster Proceso creación Wallet Global (Bodega).

El servidor, al arrancar, busca el archivo wallet_default.json. Si existe, carga la wallet global con las claves ahí guardadas. Si no existe, genera una nueva wallet (usando elliptic), la guarda en ese archivo y la usa como wallet global. Esta wallet se utiliza para firmar transacciones administrativas (como burn) y para cualquier operación que requiera la clave privada del servidor. ````
En el sistema actual, cualquier usuario que descargue e instale el software en un entorno nuevo (sin el archivo wallet_default.json) generará automáticamente una wallet global propia al iniciar el servidor por primera vez. Esa wallet global será única para esa instalación, a menos que el usuario copie manualmente el archivo de otra instancia.

Resumen:

Cada instalación genera su propia wallet global si no existe el archivo.
Si se copia el archivo wallet_default.json entre servidores, compartirán la misma wallet global.
Por defecto, cada instancia en producción tendrá su propia wallet global, salvo que se distribuya manualmente el archivo de claves.


### Wallet gobal autómatica pero sin UTXO's 
 Razonamiento es correcto y es una práctica habitual en sistemas blockchain:

Tener una wallet global no implica riesgo si no tiene UTXOs asignados.

Una wallet sin fondos (sin UTXOs) no puede firmar ni emitir transacciones válidas, ni minar, ni realizar operaciones relevantes en la red.
El verdadero “poder” o capacidad de operar lo otorga la posesión de UTXOs.
El riesgo real está en la distribución de los UTXOs iniciales.

Si solo la autoridad (o un proceso controlado) puede asignar los UTXOs iniciales (por ejemplo, los 5000 del génesis), entonces solo las wallets autorizadas podrán operar como bodegas activas.
Puedes automatizar la creación de wallets globales, pero controlar estrictamente la entrega de UTXOs iniciales (por ejemplo, mediante un proceso de registro, whitelist, o validación manual).
¿Dónde filtrar/autorizar?

El filtro más seguro es en la entrega de UTXOs iniciales: solo asignar fondos a wallets verificadas/autorizadas.
El bloque génesis o la transacción especial que otorga los 5000 debe estar bajo control de la autoridad de red.
Si una wallet no tiene UTXOs, aunque exista, no puede operar ni comprometer el sistema.
Resumen:
Automatizar la creación de wallets globales no es un riesgo si controlas la asignación de UTXOs iniciales. El filtro de seguridad debe estar en la entrega de fondos, no en la generación de claves. Así, solo las bodegas autorizadas podrán operar realmente en la red. Tu planteamiento es correcto y es la estrategia recomendada.

### Recibir recompensas Wallet Global

Sí, si el sistema permite que cualquier wallet global recién creada pueda minar bloques y recibir recompensas de minado (premios en forma de UTXOs), entonces una instancia nueva podría empezar a acumular UTXOs simplemente minando, aunque no haya recibido UTXOs iniciales de la autoridad.

Esto implica:

Si el minado está abierto y no hay restricción sobre qué wallets pueden minar, cualquier nodo nuevo puede convertirse en “bodega activa” y empezar a recibir fondos por minado.
Así, aunque controles la entrega de UTXOs iniciales, si no controlas quién puede minar, cualquier wallet podría autoabastecerse de UTXOs a través de la recompensa de bloque.
Soluciones para evitarlo:

Restringir la elegibilidad para minar solo a wallets autorizadas (por whitelist, registro, etc).
Validar en el consenso de la red que solo las wallets autorizadas pueden recibir la recompensa de minado.
Si una wallet no está en la lista de autorizadas, los bloques que mine no son aceptados por el resto de la red.
Resumen:
Si no filtras quién puede minar, cualquier wallet puede empezar a acumular UTXOs por sí misma. El control debe aplicarse tanto a la entrega de UTXOs iniciales como a la elegibilidad para minar y recibir recompensas.


### FLUJO
### 1. Dónde ocurre el proceso
- El proceso de generación y carga de la wallet global ocurre al iniciar el servidor, normalmente en `server.js` o en un archivo de inicialización relacionado.
- El archivo clave es `app/uploads/wallet_default.json`.

### 2. Flujo detallado

#### a) Comprobación de existencia del archivo de wallet
- Se define la ruta:  
  `const walletPath = path.join(__dirname, "app/uploads/wallet_default.json");`
- Se verifica si el archivo existe:
  ```js
  if (fs.existsSync(walletPath)) {
    // Si existe, se carga la wallet global
    keyPairData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
    global.wallet = new Wallet(
      keyPairData.publicKey,
      INITIAL_BALANCE,
      keyPairData.privateKey
    );
  } else {
    // Si no existe, se genera una nueva wallet global
    global.wallet = new Wallet();
    // Se guarda la nueva wallet en wallet_default.json
    fs.writeFileSync(walletPath, JSON.stringify({
      publicKey: global.wallet.publicKey,
      privateKey: global.wallet.privateKey
    }, null, 2));
  }

  Función principal:
Constructor de la clase Wallet (probablemente en wallet/Wallet.js).
b) Generación de claves (si no existe el archivo)
En el constructor de Wallet:

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
this.keyPair = ec.genKeyPair();
this.publicKey = this.keyPair.getPublic('hex');
this.privateKey = this.keyPair.getPrivate('hex');

Parámetros:
Si se pasa una clave privada, la wallet se inicializa con ella.
Si no, se genera una nueva clave privada y pública.
c) Guardado de la wallet
Tras generar la wallet, se guarda en app/uploads/wallet_default.json:

fs.writeFileSync(walletPath, JSON.stringify({
  publicKey: global.wallet.publicKey,
  privateKey: global.wallet.privateKey
}, null, 2));

d) Uso posterior
La wallet global (global.wallet) se usa para firmar transacciones, por ejemplo en el endpoint /baja-token:

const bajaTransaction = global.wallet.createTransaction(
  destino,         // dirección destino
  totalAmount,     // cantidad a transferir
  bc,              // instancia de blockchain
  tp,              // transaction pool
  bc.utxoSet       // conjunto de UTXOs
);

3. Resumen de funciones y parámetros clave
fs.existsSync(walletPath)
Comprueba si existe el archivo de la wallet.
fs.readFileSync(walletPath, "utf8")
Lee el archivo y obtiene las claves.
new Wallet(publicKey, initialBalance, privateKey)
Inicializa la wallet con claves existentes.
new Wallet()
Genera una nueva wallet (claves nuevas).
fs.writeFileSync(walletPath, JSON.stringify(...))
Guarda la wallet generada.
global.wallet.createTransaction(destino, amount, bc, tp, utxoSet)
Crea y firma una transacción usando la wallet global.
4. Librerías utilizadas
fs (Node.js): para leer y escribir archivos.
elliptic: para generación de claves ECDSA secp256k1.
path: para rutas de archivos.
En resumen:
El servidor, al arrancar, busca el archivo wallet_default.json. Si existe, carga la wallet global con las claves ahí guardadas. Si no existe, genera una nueva wallet (usando elliptic), la guarda en ese archivo y la usa como wallet global. Esta wallet se utiliza para firmar transacciones administrativas (como burn) y para cualquier operación que requiera la clave privada del servidor. ``````
