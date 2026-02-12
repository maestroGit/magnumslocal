// app/models/RegulacionDo.js
// Regulaciones y practicas por DO

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RegulacionDo = sequelize.define('RegulacionDo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  rendimiento_max_kg_ha: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  densidad_plantacion_min: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  densidad_plantacion_max: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sistema_conduccion: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  metodo_elaboracion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tiempos_crianza_json: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  fecha_vigencia: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  underscored: true,
  tableName: 'regulaciones_do',
  timestamps: false,
});

export default RegulacionDo;
