// Utilidad para obtener la clave pública global actual desde el backend
export async function getCurrentPublicKey() {
  try {
    const resp = await fetch('/wallet/global');
    const json = await resp.json();
    return json.publicKey || '';
  } catch (e) {
    return '';
  }
}
