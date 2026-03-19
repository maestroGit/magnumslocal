# Implementacion de Login con GitHub (Microsoft) en `magnumslocal`

Guia practica para agregar `Login con GitHub` en paralelo al flujo actual de `Login con Google` y login local.

## Objetivo

Integrar GitHub OAuth2 manteniendo el mismo modelo actual:
- Sesion via `express-session`
- Usuario persistido en tabla `usuarios`
- Endpoint de usuario activo `GET /auth/user`
- Redireccion por rol a `keystore.html` o `view.html`

---

## Estado actual del proyecto

- Estrategia Google configurada en `server.js` con `passport-google-oauth20`
- Rutas auth en `app/routes/authRoutes.js`
- Logica de sesion y usuario en `app/controllers/authController.js`
- Frontend login en `public/js/login.js`

---

## Paso 1. Crear OAuth App en GitHub

En GitHub:
1. Ir a `Settings` -> `Developer settings` -> `OAuth Apps` -> `New OAuth App`.
2. Definir:
- `Application name`: `MagnumsLocal`
- `Homepage URL`: `http://localhost:6001`
- `Authorization callback URL`: `http://localhost:6001/auth/github/callback`
3. Guardar `Client ID` y `Client Secret`.

Para produccion usa tu dominio real en callback.

---

## Paso 2. Instalar dependencia

```bash
npm install passport-github2
```

---

## Paso 3. Variables de entorno

Agregar en `.env`:

```env
GITHUB_CLIENT_ID=tu_client_id
GITHUB_CLIENT_SECRET=tu_client_secret
GITHUB_CALLBACK_URL=/auth/github/callback
```

Nota:
- Puedes usar URL relativa (`/auth/github/callback`) como con Google.
- Si despliegas detras de proxy o dominio externo, valida callback absoluta.

---

## Paso 4. Configurar estrategia GitHub en `server.js`

Agregar import junto a Google:

```javascript
import { Strategy as GitHubStrategy } from "passport-github2";
```

Agregar estrategia (cerca de la estrategia Google):

```javascript
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || "/auth/github/callback";

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: GITHUB_CALLBACK_URL,
  scope: ["user:email"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const githubId = profile.id;

    const primaryEmail =
      profile.emails?.find((e) => e.verified)?.value ||
      profile.emails?.[0]?.value ||
      null;

    if (!primaryEmail) {
      return done(new Error("Email no disponible en perfil de GitHub"));
    }

    const nombre = profile.displayName || profile.username || "Usuario GitHub";
    const githubPhotoUrl = profile.photos?.[0]?.value || null;

    const [user, created] = await User.findOrCreate({
      where: { email: primaryEmail },
      defaults: {
        id: `github_${githubId}`,
        provider: "github",
        nombre,
        email: primaryEmail,
        email_verified: true,
        usercard_img: githubPhotoUrl,
        registrado: true,
        fecha_registro: new Date(),
        role: "user"
      }
    });

    if (!created && githubPhotoUrl && !user.usercard_img) {
      await user.update({ usercard_img: githubPhotoUrl });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));
```

Importante:
- Este flujo mantiene la misma semantica que Google.
- Si existe usuario por email, lo reutiliza.

---

## Paso 5. Endpoints en `app/routes/authRoutes.js`

Agregar rutas nuevas (ademas de Google):

```javascript
// GET /auth/github
router.get("/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

// GET /auth/github/callback
router.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login.html" }),
  getGitHubCallback
);
```

Tambien debes exportar un handler nuevo desde `authController`.

---

## Paso 6. Handler callback en `app/controllers/authController.js`

Crear funcion equivalente a `getGoogleCallback`:

```javascript
export const getGitHubCallback = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login.html');
    }

    // Si quieres aplicar el mismo requisito de perfil incompleto que Google,
    // reutiliza la validacion por provider o crea una funcion general social.
    const role = String(req.user.role || '').toLowerCase();
    const redirectPath = (role === 'user' || role === 'winelover' || role === 'wine_lover')
      ? '/keystore.html'
      : '/view.html';

    return res.redirect(redirectPath);
  } catch (error) {
    console.error('[authController] Error en getGitHubCallback:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
```

Y en el import/export de `authRoutes.js` incluir `getGitHubCallback`.

---

## Paso 7. Boton en frontend (`public/js/login.js` y HTML)

En el HTML de login agrega un boton o enlace:

```html
<a href="/auth/github" class="btn-social btn-github">Login con GitHub</a>
```

No requiere JS adicional si usas enlace directo al endpoint OAuth.

---

## Paso 8. Pruebas funcionales

Checklist:
- `GET /auth/github` redirige a GitHub
- Al aprobar en GitHub, vuelve a `/auth/github/callback`
- Se crea o reutiliza usuario en `usuarios`
- `GET /auth/user` devuelve usuario autenticado
- Redirige segun rol a `keystore.html` o `view.html`
- `POST /auth/logout` cierra sesion correctamente

---

## Paso 9. Seguridad y buenas practicas

- Nunca exponer `GITHUB_CLIENT_SECRET` en frontend
- Mantener `state` de OAuth (Passport lo gestiona)
- Validar HTTPS en produccion
- Revisar que `sameSite` y `secure` de cookie sean correctos segun entorno
- Evitar colisiones de cuenta: clave principal por `email`, provider en columna `provider`

---

## Cambios de codigo esperados (resumen)

- `package.json`: nueva dependencia `passport-github2`
- `server.js`: import + `GitHubStrategy`
- `app/routes/authRoutes.js`: `/auth/github` y `/auth/github/callback`
- `app/controllers/authController.js`: `getGitHubCallback`
- `public/login*.html`: boton `Login con GitHub`

---

## Nota sobre "GitHub de Microsoft"

GitHub pertenece a Microsoft, pero el login sigue siendo `GitHub OAuth`. Tecnica y formalmente el proveedor a configurar es GitHub.
