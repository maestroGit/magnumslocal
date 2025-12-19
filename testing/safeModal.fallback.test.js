// Test de fallback de safeModal cuando showModalForm no está disponible
// Simula entorno minimalista sin DOM real.

import { safeModal } from '../public/js/ui/modals.js';

// Stub alert to avoid noisy output
global.alert = () => {};

describe('safeModal fallback', () => {
  test('usa showModal cuando showModalForm no existe', () => {
    let called = { form: false, simple: false, alert: false };
  global.showModalForm = undefined;
  global.showModal = (html, title) => { called.simple = true; called.args = { html, title }; };
  global.alert = () => { called.alert = true; };

    safeModal('Titulo Prueba', '<p>Contenido</p>');
    expect(called.simple).toBe(true);
    expect(called.alert).toBe(false);
    expect(called.args.title).toBe('Titulo Prueba');
  });

  test('usa alert si no existen showModalForm ni showModal', () => {
    let called = { alert: false };
  global.showModalForm = undefined;
  global.showModal = undefined;
  global.alert = () => { called.alert = true; };
    safeModal('Sin APIs', '<p>X</p>');
    expect(called.alert).toBe(true);
  });

  test('muestra [contenido] cuando html no es string y no hay APIs', () => {
    let captured = '';
    global.showModalForm = undefined;
    global.showModal = undefined;
    global.alert = (msg) => { captured = msg; };
    safeModal('Titulo', { a: 1 });
    expect(captured).toContain('Titulo:');
    expect(captured).toContain('[contenido]');
  });

  test('no rompe si alert no existe (CI) y no hay APIs', () => {
    const prevAlert = global.alert;
    try {
      global.showModalForm = undefined;
      global.showModal = undefined;
      // Simular entorno sin alert
      delete global.alert;
      // Debe ejecutarse sin lanzar excepción
      expect(() => safeModal('Titulo', '<div>x</div>')).not.toThrow();
    } finally {
      // Restaurar alert para no afectar otros tests
      global.alert = prevAlert || (() => {});
    }
  });
});
