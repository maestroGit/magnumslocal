/**
 * register.js - Lógica de Registro de Usuarios
 * Integración con API /users endpoint
 */

console.log('[REGISTER] Script iniciado');

// DOM Elements
const registerForm = document.getElementById('registerForm');
const roleSelect = document.getElementById('role');
const categoriasGroup = document.getElementById('categorias-group');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const strengthBar = document.querySelector('.strength-bar');
const strengthText = document.getElementById('strengthText');
const registerError = document.getElementById('register-error');
const successModal = document.getElementById('successModal');
const continueBtn = document.getElementById('continueBtn');
const passwordModal = document.getElementById('passwordInfoModal');
const closePasswordModalBtn = document.getElementById('closePasswordModal');
const allCategoryCheckboxes = document.querySelectorAll('input[name="categorias"]');
const useLocationBtn = document.getElementById('useLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const locationLatInput = document.getElementById('locationLat');
const locationLngInput = document.getElementById('locationLng');

// Debug logging
console.log('[REGISTER] Elementos cargados:', {
  registerForm: !!registerForm,
  roleSelect: !!roleSelect,
  successModal: !!successModal,
  continueBtn: !!continueBtn
});

// Configuration
const API_BASE_URL = 'http://localhost:6001';

/**
 * Password Strength Validator
 */
const passwordValidator = {
  minLength: (pwd) => pwd.length >= 8,
  hasUppercase: (pwd) => /[A-Z]/.test(pwd),
  hasLowercase: (pwd) => /[a-z]/.test(pwd),
  hasNumber: (pwd) => /\d/.test(pwd),
  hasSpecial: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),

  /**
   * Calcula la fortaleza de la contraseña (0-5)
   */
  getStrength(pwd) {
    let strength = 0;
    if (this.minLength(pwd)) strength++;
    if (this.hasUppercase(pwd)) strength++;
    if (this.hasLowercase(pwd)) strength++;
    if (this.hasNumber(pwd)) strength++;
    if (this.hasSpecial(pwd)) strength++;
    return strength;
  },

  /**
   * Obtiene el nivel de fortaleza como string
   */
  getStrengthLevel(pwd) {
    const strength = this.getStrength(pwd);
    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'fair';
    return 'strong';
  },

  /**
   * Valida si la contraseña cumple requisitos mínimos
   */
  isValid(pwd) {
    return (
      this.minLength(pwd) &&
      this.hasUppercase(pwd) &&
      this.hasLowercase(pwd) &&
      this.hasNumber(pwd)
    );
  }
};

/**
 * Actualiza el indicador de fortaleza de contraseña
 */
function updatePasswordStrength() {
  const pwd = passwordInput.value;
  if (!pwd) {
    strengthBar.className = 'strength-bar';
    strengthText.textContent = '';
    return;
  }

  const level = passwordValidator.getStrengthLevel(pwd);
  const strength = passwordValidator.getStrength(pwd);

  // Update bar
  strengthBar.className = `strength-bar ${level}`;

  // Update text
  strengthText.className = `strength-text ${level}`;
  if (level === 'weak') {
    strengthText.textContent = `Débil (${strength}/5)`;
  } else if (level === 'fair') {
    strengthText.textContent = `Media (${strength}/5)`;
  } else {
    strengthText.textContent = `Fuerte (${strength}/5)`;
  }

  // Update requirements display
  updatePasswordRequirements(pwd);
}

/**
 * Actualiza los requisitos visuales de contraseña
 */
function updatePasswordRequirements(pwd) {
  const requirements = {
    'length': passwordValidator.minLength(pwd),
    'uppercase': passwordValidator.hasUppercase(pwd),
    'lowercase': passwordValidator.hasLowercase(pwd),
    'number': passwordValidator.hasNumber(pwd),
    'special': passwordValidator.hasSpecial(pwd)
  };

  Object.entries(requirements).forEach(([key, met]) => {
    const reqElement = document.getElementById(`req-${key}`);
    if (reqElement) {
      if (met) {
        reqElement.classList.remove('unmet');
        reqElement.classList.add('met');
      } else {
        reqElement.classList.add('unmet');
        reqElement.classList.remove('met');
      }
    }
  });
}

/**
 * Valida que las contraseñas coincidan
 */
function validatePasswordMatch() {
  if (passwordInput.value && confirmPasswordInput.value) {
    if (passwordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.classList.add('input-error');
      confirmPasswordInput.classList.remove('input-success');
      return false;
    } else {
      confirmPasswordInput.classList.remove('input-error');
      confirmPasswordInput.classList.add('input-success');
      return true;
    }
  }
  return true;
}

/**
 * Muestra/oculta el grupo de categorías según el tipo de usuario
 */
function toggleCategoriesGroup() {
  const role = roleSelect.value;
  if (role === 'winery') {
    categoriasGroup.classList.remove('hidden-category');
    categoriasGroup.classList.add('visible-category');
  } else {
    categoriasGroup.classList.add('hidden-category');
    categoriasGroup.classList.remove('visible-category');
    // Desmarcar todos los checkboxes
    allCategoryCheckboxes.forEach(cb => cb.checked = false);
  }
}

/**
 * Obtiene las categorías seleccionadas
 */
function getSelectedCategories() {
  return Array.from(allCategoryCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

/**
 * Valida el formulario completo
 */
function validateForm() {
  const errors = [];

  // Validar nombre
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre || nombre.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  // Validar email
  const email = document.getElementById('email').value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Email inválido');
  }

  // Validar role
  const role = roleSelect.value;
  if (!role) {
    errors.push('Debes seleccionar un tipo de cuenta');
  }

  // Validar password
  const pwd = passwordInput.value;
  if (!passwordValidator.isValid(pwd)) {
    errors.push('La contraseña no cumple los requisitos mínimos');
  }

  // Validar que coincidan passwords
  if (pwd !== confirmPasswordInput.value) {
    errors.push('Las contraseñas no coinciden');
  }

  // Validar términos
  if (!document.getElementById('terms').checked) {
    errors.push('Debes aceptar los Términos y Condiciones');
  }

  if (!document.getElementById('privacy').checked) {
    errors.push('Debes aceptar la Política de Privacidad');
  }

  return errors;
}

/**
 * Muestra errores en el formulario
 */
function showError(message) {
  registerError.textContent = message;
  registerError.classList.add('visible');
}

/**
 * Limpia los errores
 */
function clearError() {
  registerError.textContent = '';
  registerError.classList.remove('visible');
}

/**
 * Crea un ID único para el usuario (timestamp + random)
 */
function generateUserId(provider = 'email') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${provider}_${timestamp}_${random}`;
}

/**
 * Envía la solicitud de registro al servidor
 */
async function submitRegister(event) {
  event.preventDefault();
  clearError();

  // Validar formulario
  const validationErrors = validateForm();
  if (validationErrors.length > 0) {
    showError(validationErrors[0]);
    return;
  }

  // Deshabilitar botón
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando cuenta...';

  try {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const city = document.getElementById('city')?.value.trim() || '';
    const role = roleSelect.value;
    const categorias = getSelectedCategories();
    const password = passwordInput.value;
    const localizacionDireccion = city || null;
    const latValue = locationLatInput?.value ? Number(locationLatInput.value) : null;
    const lngValue = locationLngInput?.value ? Number(locationLngInput.value) : null;

    // Preparar data
    const userData = {
      id: generateUserId('email'),
      provider: 'email',
      nombre,
      email,
      role,
      categorias: categorias.length > 0 ? categorias : null,
      localizacion_direccion: localizacionDireccion,
      localizacion_lat: Number.isFinite(latValue) ? latValue : null,
      localizacion_lng: Number.isFinite(lngValue) ? lngValue : null,
      password
    };

    // Enviar al servidor
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        showError('Este email ya está registrado. Intenta con otro.');
      } else {
        showError(responseData.error || 'Error al crear la cuenta. Intenta más tarde.');
      }
      return;
    }

    // Éxito - mostrar modal
    showSuccessModal(nombre);

  } catch (error) {
    console.error('[REGISTER] Error:', error);
    showError('Error de conexión. Verifica tu conexión a internet.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * Muestra el modal de éxito
 */
function showSuccessModal(nombre) {
  const userNameDisplay = document.getElementById('userNameDisplay');
  if (userNameDisplay) {
    userNameDisplay.textContent = nombre;
  }

  // Ocultar formulario (usando clases en lugar de inline styles)
  if (registerForm) registerForm.classList.add('hidden');
  
  const divider = document.querySelector('.social-login-divider');
  if (divider) divider.classList.add('hidden');
  
  const googleContainer = document.querySelector('.google-login-container');
  if (googleContainer) googleContainer.classList.add('hidden');
  
  const loginLink = document.querySelector('.register-login-link');
  if (loginLink) loginLink.classList.add('hidden');

  // Mostrar modal (remover clase hidden y agregar visible)
  if (successModal) {
    successModal.classList.remove('modal-hidden');
    successModal.classList.add('visible');
  }
}

/**
 * Cierra el modal de éxito y redirige
 */
function handleContinue() {
  window.location.href = 'login.html';
}

/**
 * Event Listeners
 */

// Actualizar fortaleza de contraseña (sin mostrar modal automáticamente)
passwordInput.addEventListener('input', () => {
  updatePasswordStrength();
});

// Mostrar/ocultar modal de requisitos al enfocar/desenfoca el password input
passwordInput.addEventListener('focus', () => {
  if (passwordModal && passwordInput.value) {
    passwordModal.classList.remove('modal-hidden');
    passwordModal.classList.add('visible');
  }
});

passwordInput.addEventListener('blur', () => {
  if (passwordModal) {
    passwordModal.classList.add('modal-hidden');
    passwordModal.classList.remove('visible');
  }
});

// Validar coincidencia de passwords
confirmPasswordInput.addEventListener('input', validatePasswordMatch);

// Toggle categorías según tipo de usuario
roleSelect.addEventListener('change', toggleCategoriesGroup);

// Ubicación exacta (opcional)
if (useLocationBtn) {
  useLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      if (locationStatus) locationStatus.textContent = 'Geolocalización no disponible.';
      return;
    }

    useLocationBtn.disabled = true;
    useLocationBtn.textContent = 'Detectando ubicación...';
    if (locationStatus) {
      locationStatus.textContent = 'Solicitando permiso...';
      locationStatus.classList.remove('success', 'error');
      locationStatus.classList.add('neutral');
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (locationLatInput) locationLatInput.value = latitude.toFixed(6);
        if (locationLngInput) locationLngInput.value = longitude.toFixed(6);
        if (locationStatus) {
          locationStatus.textContent = 'Ubicación guardada.';
          locationStatus.classList.add('success');
          locationStatus.classList.remove('error', 'neutral');
        }
        useLocationBtn.disabled = false;
        useLocationBtn.textContent = 'Actualizar ubicación';
      },
      (error) => {
        console.error('[REGISTER] Geolocation error:', error);
        if (locationStatus) {
          locationStatus.textContent = 'No se pudo obtener la ubicación.';
          locationStatus.classList.add('error');
          locationStatus.classList.remove('success', 'neutral');
        }
        useLocationBtn.disabled = false;
        useLocationBtn.textContent = 'Usar ubicación exacta';
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}

// Enviar formulario
registerForm.addEventListener('submit', submitRegister);

// Continuar después de éxito
if (continueBtn) {
  continueBtn.addEventListener('click', handleContinue);
}

// Explorar mapa después de éxito
const exploreMapBtn = document.getElementById('exploreMapBtn');
if (exploreMapBtn) {
  exploreMapBtn.addEventListener('click', () => {
    window.location.href = 'view.html';
  });
}

// Cerrar modal de password info
if (closePasswordModalBtn) {
  closePasswordModalBtn.addEventListener('click', () => {
    if (passwordModal) {
      passwordModal.classList.add('modal-hidden');
      passwordModal.classList.remove('visible');
    }
  });
}

// Cerrar modales al hacer click fuera
window.addEventListener('click', (event) => {
  if (event.target === successModal) {
    handleContinue();
  }
  if (event.target === passwordModal) {
    passwordModal.classList.add('modal-hidden');
    passwordModal.classList.remove('visible');
  }
});

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log('[REGISTER] Formulario de registro cargado');
});
