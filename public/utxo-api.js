// utxo-api.js
// Funciones para interactuar con el backend de UTXOs y balance

export async function fetchUTXOs(address) {
  try {
    let base = '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      base = 'http://localhost:6001';
    } else if (window.location.hostname.includes('app.blockswine.com')) {
      base = 'https://app.blockswine.com';
    } else if (window.location.hostname.includes('apps.run-on-seenode.com')) {
      base = 'https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com';
    }
    const url = `${base}/utxo-balance/${encodeURIComponent(address)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch utxos: " + res.status);
    const data = await res.json();
    console.log('[DEBUG][utxo-api.js] data recibido de backend:', data);
    // Si el backend devuelve utxosDisponibles o utxosPendientes, retornar el objeto completo
    if (data && (Array.isArray(data.utxosDisponibles) || Array.isArray(data.utxosPendientes))) {
      return data;
    }
    // Retrocompatibilidad
    return Array.isArray(data) ? data : data.utxos || [];
  } catch (err) {
    console.error("fetchUTXOs error", err);
    return [];
  }
}

// Historial de transacciones por dirección
export async function fetchAddressHistory(address) {
  try {
    let base = '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      base = 'http://localhost:6001';
    } else if (window.location.hostname.includes('app.blockswine.com')) {
      base = 'https://app.blockswine.com';
    } else if (window.location.hostname.includes('apps.run-on-seenode.com')) {
      base = 'https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com';
    }
    const url = `${base}/address-history/${encodeURIComponent(address)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch address history: ' + res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.history || []);
  } catch (err) {
    console.error('fetchAddressHistory error', err);
    return [];
  }
}
