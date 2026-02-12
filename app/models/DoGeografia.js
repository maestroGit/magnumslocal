// app/models/DoGeografia.js
// Datos geograficos por DO

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DoGeografia = sequelize.define('DoGeografia', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  do_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  continente: {
    type: DataTypes.ENUM(
      'Asia',
      'América',
      'África',
      'Antártida',
      'Europa',
      'Oceanía',
      'América del Norte',
      'América del Sur'
    ),
    allowNull: false,
  },
  lat: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  lng: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  altitud: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pendiente: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
  orientacion: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  tipo_suelo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  geom: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  underscored: true,
  tableName: 'do_geografia',
  timestamps: false,
});

export default DoGeografia;
