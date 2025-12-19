import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

describe('Endpoints de lote y propietario', () => {
  let testLoteId = 'test-lote-123';
  let testOwner = 'test-owner-public-key';
  let testTransactionId = null;

  // Crea una transacción y lote de prueba antes de los tests
  beforeAll(async () => {
    // Crea una transacción para el propietario
    const txRes = await axios.post(`${BASE_URL}/transaction`, {
      recipient: testOwner,
      amount: 1
    });
    testTransactionId = txRes.data.transaction.id;

    // Crea un lote vinculado a la transacción
    await axios.post(`${BASE_URL}/qr-with-proof`, {
      loteId: testLoteId,
      transactionId: testTransactionId,
      nombreProducto: 'Test Vino',
      bodega: 'Test Bodega',
      owner: testOwner
    });
  });

  it('GET /lote/:id devuelve el lote creado', async () => {
    const res = await axios.get(`${BASE_URL}/lote/${testLoteId}`);
    expect(res.data.success).toBe(true);
    expect(res.data.lote.loteId).toBe(testLoteId);
  });

  it('GET /propietario/:ownerPublicKey devuelve transacciones y lotes', async () => {
    const res = await axios.get(`${BASE_URL}/propietario/${testOwner}`);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.transactions)).toBe(true);
    expect(Array.isArray(res.data.lotes)).toBe(true);
    // Debe contener al menos una transacción y un lote
    expect(res.data.transactions.length).toBeGreaterThan(0);
    expect(res.data.lotes.length).toBeGreaterThan(0);
  });

  it('GET /lote/:id con id inexistente devuelve 404', async () => {
    try {
      await axios.get(`${BASE_URL}/lote/no-existe-xyz`);
    } catch (err) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.success).toBe(false);
    }
  });
});
