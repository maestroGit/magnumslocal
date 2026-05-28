// Utilidad para obtener información de la wallet global actual desde el backend.
export async function getCurrentPublicKeyInfo() {
  try {
    const resp = await fetch('/wallet/global');
    const rawText = await resp.text();

    let payload = null;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }

    if (!resp.ok) {
      const backendError = payload?.error || payload?.message || null;
      return {
        publicKey: '',
        error: backendError || `HTTP ${resp.status}`,
        status: resp.status,
      };
    }

    return {
      publicKey: payload?.publicKey || '',
      error: null,
      status: resp.status,
    };
  } catch (e) {
    return {
      publicKey: '',
      error: e?.message || 'Error consultando wallet/global',
      status: 0,
    };
  }
}

// Compatibilidad con llamadas existentes que solo esperan la clave pública.
export async function getCurrentPublicKey() {
  const result = await getCurrentPublicKeyInfo();
  return result.publicKey || '';
}
