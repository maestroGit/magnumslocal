// Compatibility shim for legacy global identifiers used by classic scripts
// This script runs after bootstrap.js and exposes window-bound helpers
// as var bindings so `typeof helper === 'function'` checks succeed.

/* eslint-disable no-var */
// Legacy compatibility shim no longer needed: all consumers migrated to ES Modules.
// File retained temporarily as a no-op to avoid 404s if still referenced in HTML backups.
(function(){ console.debug('[compat-globals] shim is now a no-op (ESM migration complete)'); })();
