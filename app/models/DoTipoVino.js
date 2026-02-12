// app/models/DoTipoVino.js
// Tabla puente DO <-> Tipos de vino

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DoTipoVino = sequelize.define('DoTipoVino', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tipo_vino_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  underscored: true,
  tableName: 'do_tipos_vino',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['do_id', 'tipo_vino_id'],
    },
  ],
});

export default DoTipoVino;
