// testing/transactionEndpoints.test.js
// Tests para endpoints de transacciones (FASE 3)

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:6001';
const BODEGA_PASSPHRASE = process.env.BODEGA_PASSPHRASE || '';
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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  throw new Error(`Respuesta no JSON (status ${response.status}): ${text.slice(0, 120)}`);
}

// ============================================
// TEST SUITE: Transaction Endpoints
// ============================================

async function runTests() {
  log('\n🧪 ========================================', 'blue');
  log('   FASE 3: Transaction Endpoints Test Suite', 'blue');
  log('========================================\n', 'blue');

  // Test 1: GET /transactionsPool
  await test('GET /transactionsPool devuelve array', async () => {
    const response = await fetch(`${API_URL}/transactionsPool`);
    const data = await readJson(response);

    assertEqual(response.status, 200, 'Status code debe ser 200');
    const isArray = Array.isArray(data) || Array.isArray(data.transactions);
    assertTruthy(isArray, 'Debe devolver un array de transacciones');
  });

  // Test 2: POST /transaction sin flujo valido
  await test('POST /transaction sin flujo devuelve 400', async () => {
    const response = await fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await readJson(response);

    assertEqual(response.status, 400, 'Status code debe ser 400');
    assertTruthy(data.error, 'Debe devolver error');
  });

  // Test 3: POST /transaction signedTransaction mal formado
  await test('POST /transaction signedTransaction mal formado devuelve 400', async () => {
    const response = await fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTransaction: {} })
    });
    const data = await readJson(response);

    assertEqual(response.status, 400, 'Status code debe ser 400');
    assertTruthy(data.error?.toLowerCase().includes('malformed') || data.error, 'Debe indicar error de estructura');
  });

  // Test 4: POST /transaction signedTransaction sin UTXOs
  await test('POST /transaction signedTransaction sin UTXOs devuelve 400', async () => {
    const response = await fetch(`${API_URL}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedTransaction: {
          id: `tx-test-${Date.now()}`,
          inputs: [
            { txId: 'fake', outputIndex: 0, address: 'fake-address', amount: 1 }
          ],
          outputs: [
            { amount: 1, address: 'fake-address' }
          ]
        }
      })
    });
    const data = await readJson(response);

    assertEqual(response.status, 400, 'Status code debe ser 400');
    assertTruthy(data.error, 'Debe devolver error');
  });

  // Test 5: POST /transaction bodega (opcional)
  if (BODEGA_PASSPHRASE) {
    await test('POST /transaction modo bodega responde', async () => {
      const response = await fetch(`${API_URL}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bodega',
          recipient: '04test_recipient_bodega',
          amount: 1,
          passphrase: BODEGA_PASSPHRASE
        })
      });
      const data = await readJson(response);

      assertTruthy([200, 400, 403].includes(response.status), 'Status debe ser 200, 400 o 403');
      assertTruthy(data.success === true || data.error, 'Debe devolver success o error');
    });
  } else {
    log('ℹ️  BODEGA_PASSPHRASE no definida: se omite test de modo bodega', 'yellow');
  }

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

runTests().catch(error => {
  log(`\n❌ Error fatal ejecutando tests: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
