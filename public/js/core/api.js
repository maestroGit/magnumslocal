// Core API helpers (ESM)
import { apiBaseUrl } from './config.js';

export async function fetchData(endpoint, options = {}) {
  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, options);
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error fetching ${endpoint}: ${errorMessage}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return { error: error.message };
  }
}

export function copyTxId(id) {
  if (!id) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(id)
      .then(() => alert('Transfer ID copied to clipboard'))
      .catch(() => alert('Could not copy'));
  } else {
    alert('Clipboard not available');
  }
}
