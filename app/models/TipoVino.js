// app/models/TipoVino.js
// Modelo para catalogo de tipos de vino

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TipoVino = sequelize.define('TipoVino', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  underscored: true,
  tableName: 'tipos_vino',
  timestamps: false,
});

export default TipoVino;
