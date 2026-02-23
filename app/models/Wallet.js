// app/models/Wallet.js
// Sequelize Wallet model for db-architect skill

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.STRING(32),
    primaryKey: true,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING(160),
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'inactive', // active/inactive
  },
  type: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'internal', // metamask, internal, etc.
  },
  fecha_vinculacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_id: {
    type: DataTypes.STRING(32),
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
}, {
  underscored: true,
  tableName: 'wallets',
  timestamps: false,
});

// Elimino la importación directa y la relación aquí para evitar el error de inicialización circular.
// La relación Wallet.belongsTo(User, { foreignKey: 'usuario_id' }) se define en app/models/index.js

export default Wallet;
