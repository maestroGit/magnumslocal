const form = document.getElementById('completeProfileForm');
const errorDiv = document.getElementById('complete-profile-error');
const roleInput = document.getElementById('role');
const cityInput = document.getElementById('city');
const useLocationBtn = document.getElementById('useLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const locationLatInput = document.getElementById('locationLat');
const locationLngInput = document.getElementById('locationLng');

function showError(message) {
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.classList.add('visible');
}

function clearError() {
  if (!errorDiv) return;
  errorDiv.textContent = '';
  errorDiv.classList.remove('visible');
}

function setLocationStatus(message, statusClass) {
  if (!locationStatus) return;
  locationStatus.textContent = message;
  locationStatus.classList.remove('success', 'error', 'neutral');
  locationStatus.classList.add(statusClass);
}

async function getCurrentAuthUser() {
  const res = await fetch('/auth/user', { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}

async function bootstrap() {
  try {
    const authData = await getCurrentAuthUser();

    if (!authData?.user) {
      window.location.href = 'login.html';
      return;
    }

    if (!authData.profileIncomplete) {
      window.location.href = 'view.html';
      return;
    }

    if (['user', 'winery'].includes(authData.user.role)) {
      roleInput.value = authData.user.role;
    }

    if (authData.user.localizacion_direccion) {
      cityInput.value = authData.user.localizacion_direccion;
    }
  } catch (error) {
    console.error('[COMPLETE_PROFILE] Error en bootstrap:', error);
    window.location.href = 'login.html';
  }
}

if (useLocationBtn) {
  useLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocalización no disponible.', 'error');
      return;
    }

    useLocationBtn.disabled = true;
    useLocationBtn.textContent = 'Detectando ubicación...';
    setLocationStatus('Solicitando permiso...', 'neutral');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        locationLatInput.value = latitude.toFixed(6);
        locationLngInput.value = longitude.toFixed(6);
        setLocationStatus('Ubicación guardada.', 'success');
        useLocationBtn.disabled = false;
        useLocationBtn.textContent = 'Actualizar ubicación';
      },
      (error) => {
        console.error('[COMPLETE_PROFILE] Geolocation error:', error);
        setLocationStatus('No se pudo obtener la ubicación.', 'error');
        useLocationBtn.disabled = false;
        useLocationBtn.textContent = 'Usar ubicación exacta *';
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const role = roleInput.value;
    const city = cityInput.value.trim();
    const lat = Number(locationLatInput.value);
    const lng = Number(locationLngInput.value);

    if (!['user', 'winery'].includes(role)) {
      showError('Debes seleccionar un tipo de cuenta.');
      return;
    }

    if (city.length < 2) {
      showError('La ciudad es obligatoria.');
      return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      showError('Debes compartir una ubicación exacta.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const previousText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';
    }

    try {
      const response = await fetch('/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role,
          city,
          localizacion_lat: lat,
          localizacion_lng: lng
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showError(data.error || 'No se pudo completar el perfil.');
        return;
      }

      window.location.href = 'view.html';
    } catch (error) {
      console.error('[COMPLETE_PROFILE] Error guardando perfil:', error);
      showError('Error de conexión. Intenta nuevamente.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = previousText || 'Guardar y continuar';
      }
    }
  });
}

bootstrap();
