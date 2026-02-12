// app/models/DoClima.js
// Datos climaticos por DO

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DoClima = sequelize.define('DoClima', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  temp_media: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
  precipitacion_anual: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },
  amplitud_termica: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
  dias_helada: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  horas_sol: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_muestreo: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  underscored: true,
  tableName: 'do_clima',
  timestamps: false,
});

export default DoClima;
