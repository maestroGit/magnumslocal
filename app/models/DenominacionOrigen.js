// app/models/DenominacionOrigen.js
// Modelo para denominaciones de origen

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DenominacionOrigen = sequelize.define('DenominacionOrigen', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  pais: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  region: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  subzona: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  superficie_vinedo_ha: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  produccion_anual_hl: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  altitud_min: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  altitud_max: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  clima: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  suelos_predominantes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  descripcion_terroir: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  normativa_url: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  consejo_regulador: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
}, {
  underscored: true,
  tableName: 'denominaciones_origen',
  timestamps: false,
});

export default DenominacionOrigen;
