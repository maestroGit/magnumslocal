refactor(frontend): migración completa de fetchData.js a arquitectura ESM modular, eliminación de globals y mejora de funcionalidades

Resumen ejecutivo:
Se reemplazó el frontend monolítico basado en fetchData.js y globals (window.*) por módulos ES (ESM) claramente separados (core, render, features, ui). Se eliminaron dependencias legacy, se consolidaron modales/toasts, se redujo la superficie global a cero y se introdujeron mejoras funcionales (coin control estable, baja token, BURN directo, minería contextual, QR verificación ESM).

Cambios principales:

Eliminado: fetchData.js (archivo monolítico legacy).
Conversión a ESM: qrProof.js (ya no depende de window.verifyQRProof).
Eliminación globals: removido window.MM y verifyQRProof global; compat-globals.js neutralizado (no-op).
Nuevos módulos / responsabilidades:
core/config.js: apiBaseUrl centralizado.
core/api.js: fetchData(endpoint) y copyTxId.
ui/modals.js: showModal, showModalForm, showToast, showProgressModal, animateProgress, closeCurrentModal, showInlineModal, safeModal (refactor de fallback sin depender de globals).
events/dom.js: binding centralizado de botones dashboard + delegación (data-open-url, copy-txid, show-block-txs-btn, LAST block).
render/blocks.js, mempool.js, wallet.js, monitoring.js: separación por contexto.
features/transactions.js: envío de transacciones + coin control (UTXO selection + confirmación).
features/bajaToken.js: formulario y flujo para /baja-token (Consumed bottle).
features/walletModal.js: gestión de wallet y UTXO (incluye integración BURN).
features/verification.js: verifyQRProof modular (progreso + modales).
features/traceability.js: generación QR / registro lote.
Refinado minería: minado contextual con modal específico “Nuevo bloque minado” y botón dinámico para ver transacciones (índice LAST).
Coin Control: modal con lista UTXO (checkbox), validaciones y confirmación antes de submit.
Baja / BURN: botón Consumed bottle + BURN en wallet modal ejecuta submitBajaToken y refresca UTXO.
safeModal: ahora decide según presencia real de contenedores DOM (loteModal / errorModal) evitando alert innecesarios.
Eliminado error /undefined/utxo-balance: se dejó de usar window.apiBaseUrl; import directo de apiBaseUrl.
README-frontend-ESM.md añadido documentando arquitectura, patrones y próximos pasos.
Mejoras de calidad:

Reducción del acoplamiento (cada concern con su módulo).
Fallbacks controlados para UI (alert solo última instancia).
Delegación de eventos reduce listeners dispersos y elimina onclick inline.
Preparado para pruebas unitarias (modular, sin globals).
Código más trazable con prefijos de logging ([TX][MODULE], [events], etc.).
Impacto funcional:

Todas las operaciones previas (ver bloques, mempool, balance, clave pública, registrar transacción, baja token, minar, ver QR) siguen funcionando con modales consistentes.
BURN ejecuta /baja-token y refresca visualización UTXO.
Verificación QR ahora ESM y sin dependencia de ventana global.
Consideraciones y compatibilidad:

compat-globals.js queda como no-op (puede eliminarse en commit posterior si no hay referencias históricas).
No se detectan consumidores restantes de window.MM o verifyQRProof.
Se mantiene window.walletAddress como única variable global necesaria (cache de dirección) — susceptible de migrar a un store ESM central en futuro.
Próximos pasos (no incluidos en este commit):

Validación previa de baja: GET /transaction/:id antes de llamar /baja-token.
Tests Jest: bajaToken (happy/error), minería (renderBlocks con showModal:false), safeModal edge cases.
Contrato de endpoints documentado (inputs/outputs, códigos de error) en README-frontend-ESM.md.
Eliminación definitiva de compat-globals.js cuando se confirme ausencia de referencias externas.
Motivación:

Facilitar mantenimiento y escalabilidad.
Reducir riesgo de regresiones ocultas por globals.
Alinear el frontend con buenas prácticas modulares y testabilidad.
Unificar experiencia de usuario en modales y toasts, antes dispersa.
Changelog detallado (por área):

Arquitectura: +13 nuevos módulos ESM; -1 archivo legacy.
UI: safeModal reescrito sin dependencia window.*, progreso unificado.
Eventos: +1 listener principal; eliminación de handlers inline.
Transacciones: coin control modular, confirmación explícita, integración trazabilidad.
Wallet: modal dedicado + BURN integrado.
QR: qrProof.js convertido a import/export estándar.
Documentación: nuevo README-frontend-ESM.md.
Commit seguro: sí (solo refactor + encapsulación + mejoras funcionales ya verificadas). No rompe endpoints.

Fin del mensaje. Puedes usar este texto directamente con:
git commit -m "refactor(frontend): migración completa de fetchData.js a arquitectura ESM modular, eliminación de globals y mejoras UX" -m "[Cuerpo del commit arriba]"

