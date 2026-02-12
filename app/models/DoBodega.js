// app/models/DoBodega.js
// Tabla puente DO <-> Bodegas (User role=winery)

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DoBodega = sequelize.define('DoBodega', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  bodega_id: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
}, {
  underscored: true,
  tableName: 'do_bodegas',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['do_id', 'bodega_id'],
    },
  ],
});

export default DoBodega;
