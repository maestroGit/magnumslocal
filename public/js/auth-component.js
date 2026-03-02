// public/js/auth-component.js
// Módulo ES6 para autenticación de usuario en magnumslocal

export class AuthComponent {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.user = null;
    this.render();
    this.checkOAuthUser();
  }

  async checkOAuthUser() {
    try {
      const res = await fetch('/auth/user', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        console.log('[AuthComponent] /auth/user response:', data);
        if (data.user) {
          this.user = data.user;
          console.log('[AuthComponent] Usuario autenticado:', this.user);
          this.render(true);
        } else {
          console.log('[AuthComponent] No hay usuario autenticado');
        }
      } else {
        console.log('[AuthComponent] /auth/user no OK:', res.status);
      }
    } catch (e) {
      console.error('[AuthComponent] Error en checkOAuthUser:', e);
    }
  }

  render(isOAuth = false) {
    if (!this.container) return;
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (this.user && (isOAuth || this.user.email || this.user.nombre || this.user.username)) {
      // Usuario autenticado (local o OAuth)
      const name = this.user.displayName || this.user.nombre || this.user.username || this.user.email || (this.user.emails && this.user.emails[0]?.value) || 'Usuario';
      const photo = this.user.photos && this.user.photos[0]?.value;
      console.log('[AuthComponent] Render usuario:', { name, photo, user: this.user });
      this.container.innerHTML = `
        <div id="auth-logout" class="auth-logout">
          <span id="auth-user-label" class="auth-user-label"></span>
          ${photo ? `<img src="${photo}" alt="Avatar" class="auth-avatar">` : ''}
          <button id="logoutBtn" class="auth-logout-btn">Cerrar sesión</button>
        </div>
      `;
      const userLabel = this.container.querySelector('#auth-user-label');
      if (userLabel) userLabel.textContent = name;
      this.addListeners();
      return;
    }
    // Solo mostrar el formulario en login.html
    if (isLoginPage) {
      this.container.innerHTML = `
        <form id="authForm" autocomplete="on" class="auth-form">
          <label for="auth-username">Usuario</label>
          <input type="text" id="auth-username" name="username" required autocomplete="username" />
          <label for="auth-password">Contraseña</label>
          <input type="password" id="auth-password" name="password" required autocomplete="current-password" />
          <button type="submit">Iniciar sesión</button>
          <div id="auth-error" class="auth-error"></div>
        </form>
        <a href="/auth/google" id="googleLoginBtn" class="google-login-btn">
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" class="google-logo">Iniciar sesión con Google
        </a>
      `;
      this.addListeners();
    } else {
      // Si no está autenticado y no es login.html, no mostrar nada
      this.container.innerHTML = '';
    }
  }

  addListeners() {
    const form = this.container.querySelector('#authForm');
    const errorDiv = this.container.querySelector('#auth-error');
    const logoutBtn = this.container.querySelector('#logoutBtn');

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const username = form["auth-username"].value.trim();
        const password = form["auth-password"].value;
        if (!username || !password) {
          if (errorDiv) {
            errorDiv.textContent = 'Usuario y contraseña son requeridos.';
            errorDiv.classList.add('visible');
          }
          return;
        }

        if (errorDiv) {
          errorDiv.textContent = '';
          errorDiv.classList.remove('visible');
        }

        try {
          const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            if (errorDiv) {
              errorDiv.textContent = data.error || 'Usuario o contraseña incorrectos.';
              errorDiv.classList.add('visible');
            }
            return;
          }

          this.user = data.user;
          this.render(true);
        } catch (error) {
          console.error('[AuthComponent] Error en login local:', error);
          if (errorDiv) {
            errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
            errorDiv.classList.add('visible');
          }
        }
      };
    }
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try {
          await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });
        } catch (error) {
          console.error('[AuthComponent] Error en logout:', error);
        } finally {
          this.user = null;
          this.render();
          window.location.href = 'login.html';
        }
      };
    }
  }
}

// Uso sugerido:
// import { AuthComponent } from './js/auth-component.js';
// new AuthComponent('#auth-container');
