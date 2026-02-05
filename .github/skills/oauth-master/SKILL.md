# Skill: OAuth & Security Architect
Description: Experto en flujos de autenticación OAuth2, OpenID Connect y manejo de JWT.

## 🛡 Security Rules (No negociables)
- **Secretos:** NUNCA escribas Client Secrets o IDs directamente en el código. Usa siempre `process.env`.
- **PKCE:** Si la web es una Single Page Application (SPA), usa siempre el flujo PKCE (Proof Key for Code Exchange).
- **State Parameter:** Usa siempre el parámetro `state` para prevenir ataques CSRF.
- **Tokens:** Los tokens de acceso deben guardarse en memoria o cookies HttpOnly, nunca en localStorage si es información sensible.
- **Token Refresh:** Implementar rotación de Refresh Tokens para mantener la sesión activa sin obligar al usuario a loguearse cada hora.
- **Validation:** Siempre verificar la firma y la expiración (exp) del JWT en el backend antes de dar acceso a rutas protegidas.

## 🛠 OAuth Workflow (blocksWine Style)
1. **Redirect:** Construir la URL de autorización con los scopes mínimos necesarios.
2. **Callback:** Crear un endpoint de callback robusto que maneje errores de "Acceso denegado".
3. **Exchange:** Intercambiar el `code` por el `access_token` en el lado del servidor (siempre que sea posible).

## 📋 Bibliotecas Preferidas
- **Node.js:** `passport-js` o `next-auth`.
- **Frontend:** SDKs oficiales del proveedor (Google, GitHub, Apple).