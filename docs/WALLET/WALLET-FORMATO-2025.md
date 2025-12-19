## Formato de Wallet Soportado (2025)

Solo se admite el formato keystore generado por el backend actual. Cualquier wallet legacy, plano o sin los campos requeridos NO será aceptada.

### Ejemplo de wallet válida

```json
{
  "keystoreVersion": 1,
  "id": "uuid-v4",
  "createdAt": "2025-11-19T12:00:00.000Z",
  "createdBy": "magnumsmaster-backend",
  "kdf": "pbkdf2",
  "kdfParams": {
    "salt": "...hex...",
    "iterations": 100000,
    "keylen": 32,
    "digest": "sha256"
  },
  "cipher": "aes-256-gcm",
  "cipherParams": {
    "iv": "...hex..."
  },
  "tag": "...hex...",
  "publicKey": "04...",
  "encryptedPrivateKey": "...hex..."
}
```

- **No se admite**: formato plano, legacy, ni wallets sin `tag`, `kdfParams`, `cipherParams`, etc.
- **Genera wallets nuevas** desde el backend (`/wallet/generate`) para asegurar compatibilidad.

---

### Migración

Si tienes wallets antiguas, genera una nueva desde el backend y transfiere los fondos si es necesario.

---

> Última actualización: 2025-11-19
