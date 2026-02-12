// app/models/DoVariedad.js
// Tabla puente DO <-> Variedades

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DoVariedad = sequelize.define('DoVariedad', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  variedad_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  underscored: true,
  tableName: 'do_variedades',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['do_id', 'variedad_id'],
    },
  ],
});

export default DoVariedad;
