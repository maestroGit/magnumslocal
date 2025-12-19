// 🧪 Test del Sistema de QR con Prueba de Propiedad Blockchain
import { Lote } from '../lote.js';

console.log("🔐 === TEST QR CON PRUEBA BLOCKCHAIN === 🔐\n");

// Crear lote de prueba
const lote = new Lote(
    'MAGNUM_2025_PROOF_001',
    'Vino Tinto Premium con Prueba Blockchain',
    '2023-10-15',
    '2033-10-15',
    'España',
    'Bodegas Blockchain Premium',
    2021,
    'Tempranillo',
    'La Rioja',
    'D.O.Ca Rioja',
    '14.5%',
    'Vino con certificación blockchain inmutable',
    'Perfecto con tecnología y carnes rojas',
    '150.00€',
    'Lote de prueba con verificación criptográfica',
    'Viñedo → Blockchain → Custodia → Verificación'
);

console.log("🍷 === LOTE CREADO === 🍷");
console.log(lote.toString());

// Simular datos de transacción blockchain
const transactionId = "tx_blockchain_proof_001";
const ownerPublicKey = "04a8b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1";
const transactionSignature = "blockchain_verified_signature_hash_256";

console.log("\n🔗 === DATOS BLOCKCHAIN === 🔗");
console.log(`Transacción ID: ${transactionId}`);
console.log(`Propietario: ${ownerPublicKey.substring(0, 20)}...`);
console.log(`Firma: ${transactionSignature}`);

// Test 1: QR tradicional (sin prueba)
console.log("\n📱 === TEST 1: QR TRADICIONAL === 📱");
try {
    const qrTradicional = await lote.generarQR();
    console.log("✅ QR tradicional generado correctamente");
    console.log(`📏 Longitud: ${qrTradicional.length} caracteres`);
} catch (err) {
    console.log("❌ Error en QR tradicional:", err.message);
}

// Test 2: QR con prueba de propiedad
console.log("\n🔐 === TEST 2: QR CON PRUEBA BLOCKCHAIN === 🔐");
try {
    const qrConPrueba = await lote.generarQRWithProof(
        transactionId,
        ownerPublicKey,
        transactionSignature
    );
    console.log("✅ QR con prueba blockchain generado correctamente");
    console.log(`📏 Longitud: ${qrConPrueba.length} caracteres`);
    
    // Verificar que incluye los datos de prueba
    const qrData = JSON.stringify(lote.toJSONWithProof(transactionId, ownerPublicKey, transactionSignature));
    const parsedData = JSON.parse(qrData);
    
    console.log("\n🔍 === VERIFICACIÓN DE CONTENIDO === 🔍");
    console.log("✅ Datos del lote presentes:", !!parsedData.loteId);
    console.log("✅ Prueba blockchain presente:", !!parsedData.blockchainProof);
    console.log("✅ ID de transacción:", parsedData.blockchainProof?.transactionId === transactionId);
    console.log("✅ Clave pública propietario:", parsedData.blockchainProof?.ownerPublicKey === ownerPublicKey);
    console.log("✅ Timestamp presente:", !!parsedData.blockchainProof?.timestamp);
    
} catch (err) {
    console.log("❌ Error en QR con prueba:", err.message);
}

// Test 3: Comparación de tamaños
console.log("\n📊 === COMPARACIÓN === 📊");
const datosTradicionales = JSON.stringify(lote.toJSON());
const datosConPrueba = JSON.stringify(lote.toJSONWithProof(transactionId, ownerPublicKey, transactionSignature));

console.log(`📏 QR tradicional: ${datosTradicionales.length} caracteres`);
console.log(`📏 QR con prueba: ${datosConPrueba.length} caracteres`);
console.log(`📈 Incremento: ${((datosConPrueba.length / datosTradicionales.length - 1) * 100).toFixed(1)}%`);

console.log("\n🎯 === CASOS DE USO === 🎯");
console.log("🍷 QR Tradicional: Información básica del lote");
console.log("🔐 QR con Prueba: Verificación completa de autenticidad y propiedad");
console.log("🔍 Verificación: Cualquiera puede validar contra blockchain");
console.log("✅ Beneficio: Inmutabilidad y prueba criptográfica de propiedad");

console.log("\n🚀 === TESTING COMPLETADO === 🚀");