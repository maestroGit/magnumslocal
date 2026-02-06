# Skill: Database & ORM Architect (PostgreSQL + Sequelize)
Description: Experto en modelado de datos para MagnumsMaster, enfocado en identidad (KYC), seguridad y relaciones blockchain.

## 🏗️ Estándar de Modelado (Sequelize)
- **Mapping:** Traducir fielmente la estructura SQL (usuarios, wallets, kyc_events) a modelos de Sequelize.
- **Naming:** Usar camelCase en JS y snake_case en la base de datos (ej: `emailVerified` -> `email_verified`).
- **Relaciones:** - Usuario 1:N Wallets (`User.hasMany(Wallet)`).
  - Usuario 1:N KYCEvents (`User.hasMany(KYCEvent)`).
- **Validaciones:** El modelo debe validar que el `email` sea real y que `kyc_status` solo acepte: 'none', 'pending', 'approved', 'rejected'.

## 🔒 Reglas de Seguridad & KYC
- **Inyección SQL:** Nunca usar strings crudos en las queries; usar siempre los métodos del ORM.
- **Auditoría:** Cada cambio en `kyc_status` del usuario DEBE disparar la creación de un registro en `kyc_events`.
- **Privacidad:** No exponer campos sensibles (como `kyc_doc_id`) en las respuestas JSON de la API por defecto.

## 🛠️ Workflow de Datos
- Al registrar un usuario vía OAuth, usar `findOrCreate` para evitar duplicados por email.
- Las consultas geográficas deben usar los campos `localizacion_lat` y `localizacion_lng`.