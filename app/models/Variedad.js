// app/models/Variedad.js
// Modelo para catalogo de variedades

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Variedad = sequelize.define('Variedad', {
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
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  underscored: true,
  tableName: 'variedades',
  timestamps: false,
});

export default Variedad;
