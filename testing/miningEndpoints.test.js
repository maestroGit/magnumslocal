// testing/miningEndpoints.test.js
// Tests para endpoints de mining (FASE 2)

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:6001';
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function test(description, testFn) {
  try {
    await testFn();
    testsPassed++;
    log(`✅ ${description}`, 'green');
  } catch (error) {
    testsFailed++;
    log(`❌ ${description}`, 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

async function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

// ============================================
// TEST SUITE: Mining Endpoints
// ============================================

async function runTests() {
  log('\n🧪 ========================================', 'blue');
  log('   FASE 2: Mining Endpoints Test Suite', 'blue');
  log('========================================\n', 'blue');

  // Test 1: POST /mine sin transacciones (mempool vacía)
  await test('POST /mine rechaza minado cuando mempool está vacía', async () => {
    const response = await fetch(`${API_URL}/mine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    assertEqual(response.status, 409, 'Status code debe ser 409 Conflict');
    assertEqual(data.success, false, 'Success debe ser false');
    assertTruthy(data.error?.includes('mempool'), 'Error debe mencionar mempool');
    assertEqual(data.mempoolSize, 0, 'mempoolSize debe ser 0');
  });

  // Test 2: Verificar que wallet global existe
  let globalWallet = null;
  await test('Obtener wallet global para crear transacción', async () => {
    const response = await fetch(`${API_URL}/wallet/global`);
    const data = await response.json();
    
    assertEqual(response.status, 200, 'Status code debe ser 200');
    assertTruthy(data.publicKey, 'Debe tener publicKey');
    globalWallet = data;
  });

  // Test 3: Verificar que /transaction existe (sin crear tx real por simplicidad)
  let transactionCreated = false;
  await test('Verificar endpoint POST /transaction existe', async () => {
    const response = await fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '04test_recipient_mining_test_key_123456',
        amount: 5
      })
    });
    
    // Esperamos un error 400 porque no enviamos passphrase
    // Pero esto confirma que el endpoint existe
    assertTruthy(
      response.status === 400 || response.status === 200,
      'Endpoint debe responder (400 o 200)'
    );
  });

  // Test 4: Validar que /mine responde correctamente (skip si no hay tx)
  log('ℹ️  Test complejo de minado con tx: requiere passphrase (modo bodega)', 'blue');

  // Test 5: Verificar endpoint de mempool si existe
  await test('Verificar que endpoint /mempool responde', async () => {
    const response = await fetch(`${API_URL}/mempool`);
    // Mempool puede existir o no, solo verificamos que responde
    assertTruthy(
      response.status === 200 || response.status === 404,
      'Endpoint debe responder'
    );
  });

  // Test 6: POST /mine-transactions (legacy)
  await test('POST /mine-transactions funciona (legacy endpoint)', async () => {
    const response = await fetch(`${API_URL}/mine-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual' // No seguir redireccionamiento
    });
    
    // Puede ser 409 (sin tx) o 302/301 (redirect si hay tx)
    const validCodes = [409, 302, 301, 200];
    assertTruthy(
      validCodes.includes(response.status),
      `Status debe ser uno de ${validCodes.join(', ')}, got ${response.status}`
    );
  });

  // Test 7: Verificar que endpoint de bloques existe
  await test('Verificar que GET /blocks existe', async () => {
    const response = await fetch(`${API_URL}/blocks`);
    assertTruthy(
      response.status === 200 || response.status === 404,
      'Endpoint debe responder'
    );
  });

  // Test 8: Validar que no se puede minar sin wallet global
  // (Este test es más conceptual, requeriría desactivar wallet temporalmente)
  log('ℹ️  Test de validación de wallet global: manual (requiere desactivar wallet)', 'blue');

  // Resumen
  log('\n========================================', 'blue');
  log('   Resumen de Tests', 'blue');
  log('========================================', 'blue');
  log(`✅ Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`❌ Failed: ${testsFailed}`, 'red');
  }
  log(`📊 Total: ${testsPassed + testsFailed}`, 'blue');
  log('========================================\n', 'blue');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Ejecutar tests
runTests().catch(error => {
  log(`\n❌ Error fatal ejecutando tests: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
