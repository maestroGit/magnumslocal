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
    return Array.isArray(data) ? data : data.utxos || [];
  } catch (err) {
    console.error("fetchUTXOs error", err);
    return [];
  }
}
