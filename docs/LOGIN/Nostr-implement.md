# Implementación Login con Nostr — magnumslocal

## Estado
- [ ] Paso 1: Instalar dependencia
- [ ] Paso 2: Crear controller `nostrController.js`
- [ ] Paso 3: Registrar rutas en `authRoutes.js`
- [ ] Paso 4: Actualizar `login.js` (frontend)
- [ ] Paso 5: (Opcional) Migrar MemoryStore a store persistente

---

## Contexto del proyecto

| Elemento | Valor |
|----------|-------|
| Framework | Express + ES Modules (`import/export`) |
| Sesiones | `express-session` con **MemoryStore** (sin store externo) |
| BD | PostgreSQL vía Sequelize (`pg 8.18.0`) |
| Auth existente | Google OAuth2 (`passport-google-oauth20`) |
| Rutas auth | `app/routes/authRoutes.js` |
| Controllers auth | `app/controllers/authController.js` |
| Frontend login | `public/js/login.js` |

---

## Paso 1 — Instalar dependencia

```bash
npm install nostr-tools
```

> `nostr-tools` provee `verifyEvent()` para verificar la firma criptográfica del evento Nostr.  
> No requiere `@noble/secp256k1` por separado (ya lo incluye internamente).

---

## Paso 2 — Crear `app/controllers/nostrController.js`

Archivo nuevo. Toda la lógica de challenge + verificación queda aislada aquí.

```javascript
// app/controllers/nostrController.js
import { verifyEvent } from "nostr-tools";
import { randomUUID } from "crypto";

/**
 * GET /auth/nostr/challenge
 * Genera un challenge único y lo guarda en la sesión del usuario.
 * Expira en 5 minutos.
 */
export const getNostrChallenge = (req, res) => {
  const challenge = randomUUID();
  const expires_at = Math.floor(Date.now() / 1000) + 300; // 5 min

  // Almacenar en la sesión Express existente (misma que usa Google OAuth)
  req.session.nostrChallenge = { challenge, expires_at };

  return res.json({ challenge, expires_at });
};

/**
 * POST /auth/nostr/verify
 * Verifica el evento firmado por el signer Nostr (NIP-07).
 * Si es válido, crea la sesión de usuario igual que /auth/login.
 *
 * Body esperado: { event: { pubkey, content, sig, kind, created_at, tags } }
 */
export const postNostrVerify = async (req, res) => {
  const { event } = req.body;

  if (!event?.content || !event?.pubkey) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const stored = req.session.nostrChallenge;

  // Verificar que el challenge existe en sesión y coincide con el firmado
  if (!stored || stored.challenge !== event.content) {
    return res.status(401).json({ error: "Challenge inválido" });
  }

  // Verificar que no ha expirado
  if (Math.floor(Date.now() / 1000) > stored.expires_at) {
    delete req.session.nostrChallenge;
    return res.status(401).json({ error: "Challenge expirado" });
  }

  // Verificar firma criptográfica del evento
  if (!verifyEvent(event)) {
    return res.status(401).json({ error: "Firma inválida" });
  }

  // Limpiar challenge tras uso (evitar replay attacks)
  delete req.session.nostrChallenge;

  // Crear sesión igual que /auth/login o Google OAuth
  req.session.user = {
    pubkey: event.pubkey,
    auth_method: "nostr",
    role: "user"  // Ajustar si se quiere buscar en BD
  };

  return res.json({ user: req.session.user });
};
```

### Notas de seguridad
- El challenge se borra tras el primer uso → no hay replay attacks
- El challenge expira en 5 min
- La verificación criptográfica usa `verifyEvent` de `nostr-tools` (verifica `sig` contra `pubkey`)
- Nunca se almacena ni se pide la `nsec`

---

## Paso 3 — Añadir rutas en `app/routes/authRoutes.js`

Añadir al final del fichero, antes de `export default router`:

```javascript
import { getNostrChallenge, postNostrVerify } from "../controllers/nostrController.js";

// Nostr auth (NIP-07)
router.get("/auth/nostr/challenge", getNostrChallenge);
router.post("/auth/nostr/verify", postNostrVerify);
```

**Rutas resultantes:**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/auth/nostr/challenge` | Genera y devuelve el challenge |
| `POST` | `/auth/nostr/verify` | Verifica firma y crea sesión |

---

## Paso 4 — Actualizar `public/js/login.js`

Añadir dentro del bloque `DOMContentLoaded`, **después** del listener del `form`, reutilizando `getPostLoginPath` y `errorDiv` ya existentes:

```javascript
// --- NOSTR LOGIN ---
const nostrBtn = document.getElementById('nostr-login-btn');

if (nostrBtn) {
  nostrBtn.addEventListener('click', async () => {
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('visible');
    }

    if (!window.nostr) {
      if (errorDiv) {
        errorDiv.textContent = 'Instala una extensión Nostr (Alby, Nos2x).';
        errorDiv.classList.add('visible');
      }
      return;
    }

    try {
      // 1. Pedir challenge al backend
      const { challenge } = await fetch('/auth/nostr/challenge', {
        credentials: 'include'
      }).then(r => r.json());

      // 2. Pedir firma al signer (NIP-07)
      const event = await window.nostr.signEvent({
        kind: 27235,
        content: challenge,
        created_at: Math.floor(Date.now() / 1000),
        tags: []
      });

      // 3. Verificar en backend
      const res = await fetch('/auth/nostr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (errorDiv) {
          errorDiv.textContent = data.error || 'Error en login Nostr.';
          errorDiv.classList.add('visible');
        }
        return;
      }

      // 4. Redirigir igual que login clásico
      window.location.href = getPostLoginPath(data?.user?.role);

    } catch (error) {
      console.error('[NOSTR LOGIN] Error:', error);
      if (errorDiv) {
        errorDiv.textContent = 'Error en login con Nostr.';
        errorDiv.classList.add('visible');
      }
    }
  });
}
```

**Añadir botón en el HTML de login:**

```html
<button type="button" id="nostr-login-btn">
  Login con Nostr
</button>
```

---

## Paso 5 — (Opcional) Migrar MemoryStore a store persistente

Actualmente `express-session` usa **MemoryStore** (sin store configurado en `server.js`). Esto es suficiente para desarrollo. Si en producción necesitas persistencia de sesión, tienes dos opciones con lo que ya tienes instalado:

### Opción A: `connect-pg-simple` (PostgreSQL ya instalado)

```bash
npm install connect-pg-simple
```

```javascript
// server.js
import connectPgSimple from "connect-pg-simple";
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({ pool }),  // tu pool pg existente
  secret: process.env.JWT_SECRET || "blockswine_secret",
  resave: false,
  saveUninitialized: false
}));
```

### Opción B: Redis (si escala a múltiples procesos)

```bash
npm install ioredis connect-redis
```

> Para el estado actual (desarrollo, un solo proceso) **no es necesario**.

---

## Flujo completo

```
[Frontend]
  └─ click "Login con Nostr"
        │
        ▼
GET /auth/nostr/challenge
  └─ Backend genera UUID + guarda en req.session.nostrChallenge
        │
        ▼
window.nostr.signEvent({ kind: 27235, content: challenge })
  └─ Extensión Nostr (Alby, Nos2x) firma con nsec del usuario
        │
        ▼
POST /auth/nostr/verify  { event }
  ├─ Compara event.content con req.session.nostrChallenge
  ├─ Verifica expiración
  ├─ verifyEvent(event) → firma criptográfica válida
  └─ Crea req.session.user → res.json({ user })
        │
        ▼
[Frontend] → getPostLoginPath(role) → keystore.html / view.html
```

---

## Archivos afectados

| Archivo | Acción |
|---------|--------|
| `app/controllers/nostrController.js` | **Crear nuevo** |
| `app/routes/authRoutes.js` | Añadir import + 2 rutas |
| `public/js/login.js` | Añadir bloque Nostr |
| `public/*.html` (login page) | Añadir botón `#nostr-login-btn` |
| `package.json` | `npm install nostr-tools` |
