// web-demo.js (versión limpia, base modular)
// Inicializa solo la estructura mínima y helpers globales

console.log('[web-demo.js] INICIO');

// Puedes importar aquí los módulos necesarios
// import * as secp from "./vendor/secp256k1.mjs";
// import scrypt from "./vendor/scrypt-pbkdf2-shim.mjs";

// Ejemplo de helper global
window.webDemoInfo = {
  version: '1.0.0',
  loaded: new Date().toISOString()
};

// Punto de entrada principal
window.addEventListener('DOMContentLoaded', () => {
  console.log('[web-demo.js] DOMContentLoaded');
  // Aquí puedes inicializar la UI, eventos, etc.
});

console.log('[web-demo.js] FIN');



