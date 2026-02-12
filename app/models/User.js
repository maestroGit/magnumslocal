// app/models/User.js
// Sequelize User model for DB architect skill
/**
 * MODELO: User (Tabla: 'usuarios')
 * ============================================================================
 * Estructura de Datos para MagnumsMaster & CartoLMM
 * * 🟦 IDENTIDAD: id (PK), provider, role (admin|winery|user), nombre, email
 * 📍 GEO-LOCALIZACIÓN: localizacion_direccion, localizacion_lat, localizacion_lng
 * 🍷 PERFIL BODEGA: descripcion, web, categorias (ARRAY), img_bottle
 * 🛡️ ESTADO KYC: kyc_status, kyc_date, kyc_doc_type, kyc_doc_id, kyc_doc_img
 * 💳 SUSCRIPCIÓN: subscription_status, subscription_type, subscription_valid_until
 * 🏆 GAMIFICACIÓN: points, badges (ARRAY)
 * ⚙️ METADATOS: registrado, fecha_registro, blockchain_active, org_id
 * ============================================================================
 * Configuración: underscored (true), timestamps (false).
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ALLOWED_BADGES = [
  // Origin and denomination
  'do_rioja',
  'doca_rioja',
  'do_ribera_duero',
  'do_ribeiro',
  'do_rueda',
  'do_ribera_sacra',
  'do_priorat',
  'do_penedes',
  'do_rias_baixas',
  'do_jerez',
  // Grapes
  'uva_tempranillo',
  'uva_garnacha',
  'uva_albarino',
  'uva_verdejo',
  'uva_mencia',
  'uva_cabernet',
  'uva_merlot',
  'uva_syrah',
  'uva_chardonnay',
  'uva_sauvignon_blanc',
  // Style
  'estilo_tinto',
  'estilo_blanco',
  'estilo_rosado',
  'estilo_espumoso',
  'estilo_dulce',
  'estilo_fortificado',
  'estilo_natural',
  // Aging
  'crianza_joven',
  'crianza_crianza',
  'crianza_reserva',
  'crianza_gran_reserva',
  // Certifications
  'cert_ecologico',
  'cert_biodinamico',
  'cert_vegano',
  'cert_sin_sulfitos',
  // Awards
  'premiada',
  'medalla_oro',
  'medalla_plata',
  'medalla_bronce',
];

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(32),
    primaryKey: true,
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  web: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  localizacion_direccion: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
  localizacion_lat: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  localizacion_lng: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  categorias: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  img_bottle: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  blockchain_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  registrado: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usercard_img: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  usercard_name: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  kyc_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'none',
  },
  kyc_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  kyc_doc_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  kyc_doc_id: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  kyc_doc_img: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  org_id: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  subscription_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'inactive', // active, expired, pending
  },
  subscription_type: {
    type: DataTypes.STRING(40),
    allowNull: true, // basic, premium, enterprise
  },
  subscription_valid_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  badges: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: [],
    validate: {
      isAllowedBadges(value) {
        if (!value) return;
        const invalid = value.filter((badge) => !ALLOWED_BADGES.includes(badge));
        if (invalid.length > 0) {
          throw new Error(`Invalid badge(s): ${invalid.join(', ')}`);
        }
      },
    },
  },
  role: {
    type: DataTypes.ENUM('admin', 'winery', 'user'),
    allowNull: false,
    defaultValue: 'user',
  },
}, {
  underscored: true,
  tableName: 'usuarios',
  timestamps: false,
  defaultScope: {
    attributes: { exclude: ['password_hash'] },
  },
});

export default User;
