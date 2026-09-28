# Changelog
Todas las modificaciones relevantes del proyecto se documentan aquí siguiendo el estándar “Keep a Changelog”.

## [Unreleased]
### Pending
- Integración JS en páginas legales.
- Nuevos endpoints REST para operaciones UTXO.
- Mejoras en el sistema P2P y relay.
- Sincronización incremental de blockchain.
- Optimización de arranque del nodo.
- **Corrección de bug:** Solucionar `ReferenceError: newChain is not defined` en el método `initialize` de la blockchain al arrancar con cadena vacía.
- **Optimización de logs:** Reducir la verbosidad en los bucles de sincronización para evitar superar el límite de 500 logs/seg en Railway.

---

## [1.0.2] - 2026-09-26
### Fixed
- Eliminado error **SIGTERM** causado por insuficiencia de memoria en Railway.
- Resuelto problema de **502 / connection refused** durante el wake-up del contenedor.
- Eliminado conflicto entre arranque pesado del nodo y Sleep Mode.

### Changed
- RAM del servicio aumentada a **512 MB** para permitir:
  - Descifrado de keystore.
  - Inicialización de blockchain.
  - Sincronización UTXO.
  - Conexión P2P + WebSocket relay.
  - Conexión a PostgreSQL