# Inventario SEC-002 - Meta CSP Duplicada (2026-09-14)

## Objetivo
Identificar paginas HTML con politica CSP embebida por meta tag para migrar a una unica fuente de verdad via header HTTP.

## Hallazgos
Se detectaron 7 archivos con `<meta http-equiv="Content-Security-Policy">`:

1. public/view.html
- Riesgo: Alto
- Motivo: vista principal de operacion y dashboard; alta sensibilidad funcional.

2. public/login.html
- Riesgo: Alto
- Motivo: entrada al flujo de autenticacion.

3. public/register.html
- Riesgo: Alto
- Motivo: onboarding y formularios de alta.

4. public/complete-profile.html
- Riesgo: Medio
- Motivo: flujo post-auth de perfil Google.

5. public/forgot-password.html
- Riesgo: Medio
- Motivo: recuperacion de credenciales.

6. public/reset-password.html
- Riesgo: Medio
- Motivo: finalizacion de recuperacion de credenciales.

7. public/list-winery.html
- Riesgo: Medio
- Motivo: pantalla funcional no critica para arranque de auth.

## Decision
SEC-006 proceder con retirada de meta CSP en los 7 archivos y unificar politica en header HTTP definido por middleware central.

## Criterio de verificacion SEC-006
- No quedan meta CSP en `public/*.html`.
- El servidor sigue entregando header `Content-Security-Policy`.
- Rutas clave (`/`, `/login.html`, `/auth/user`) siguen respondiendo correctamente.
