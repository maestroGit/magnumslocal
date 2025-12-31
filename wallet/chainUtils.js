import SHA256 from 'crypto-js/sha256.js'; // Importar SHA256 desde crypto-js
// Crear claves públicas con claves privadas
import elliptic from "elliptic";
import { v1 as uuidv1 } from "uuid";

const { ec: EC } = elliptic;
const ec = new EC("secp256k1"); // secp256k1 es una curva elíptica comúnmente utilizada en blockchain

// Clase ChainUtil es el núcleo criptográfico del sistema
// La clase ChainUtil proporciona métodos para la generación de claves, creación de identificadores únicos, hashing de datos y verificación de firmas digitales
class ChainUtil {
  // Función para generar un par de claves
  // llamar a un método estático directamente en la clase sin necesidad de crear una instancia.
  // Generar par de claves (clave pública y privada) utilizando el algoritmo de criptografía de curvas elípticas
  static genKeyPair() {
    return ec.genKeyPair(); 
  }

  // Nuevo método: generar keyPair a partir de una clave privada en hexadecimal
  static genKeyPairFromPrivate(privateKeyHex) {
    // Permite reconstruir el keyPair completo a partir de la clave privada almacenada
    return ec.keyFromPrivate(privateKeyHex, "hex");
  }

  static id() {
    // uuid.v1() Create a version 1 (timestamp) UUID
    return uuidv1(); // Generar un identificador único (UUID) de versión 1 basado en la marca de tiempo.
  }

  // hashear una entrada
  static hash(data) {
    return SHA256(JSON.stringify(data)).toString(); // Crear un hash (resumen criptográfico) de los datos proporcionados, usando el algoritmo SHA-256. Para segurar que los datos no han sido alterados.
  }

  // Verificar que la firma digital de una transacción coincida con la clave pública y el hash de los datos. 
  // Que el dataHash de transacciones y la firma coincidan con la clave pública. Esto asegura que la transacción no ha sido modificada y que ha sido firmada por la entidad que posee la clave privada correspondiente a la clave pública.
  // La signature es la firma de la transacción y tiene que ser verificada con la clave pública
  static verifySignature(publicKey, signature, dataHash) {
    console.log('[DEBUG][verifySignature] publicKey:', publicKey, 'type:', typeof publicKey);
    console.log('[DEBUG][verifySignature] dataHash:', dataHash, 'type:', typeof dataHash);
    console.log('[DEBUG][verifySignature] signature:', signature, 'type:', typeof signature);
    if (signature && typeof signature === 'object') {
      console.log('[DEBUG][verifySignature] signature.r:', signature.r, 'type:', typeof signature.r);
      console.log('[DEBUG][verifySignature] signature.s:', signature.s, 'type:', typeof signature.s);
    }
    let pubKeyObj;
    try {
      pubKeyObj = ec.keyFromPublic(publicKey, "hex");
      console.log('[DEBUG][verifySignature] pubKeyObj:', pubKeyObj);
    } catch (e) {
      console.error('[DEBUG][verifySignature] Error creando pubKeyObj:', e);
      return false;
    }
    let verifyResult;
    try {
      verifyResult = pubKeyObj.verify(dataHash, signature);
      console.log('[DEBUG][verifySignature] verify() result:', verifyResult);
    } catch (e) {
      console.error('[DEBUG][verifySignature] Error en pubKeyObj.verify:', e);
      return false;
    }
    return verifyResult;
  }

}

export { ChainUtil };