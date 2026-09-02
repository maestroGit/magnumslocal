// app/models/Notification.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  winery_id: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'TOKEN_BURNED',
  },
  tx_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  burn_address: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  amount: {
    type: DataTypes.NUMERIC,
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['winery_id', 'tx_id', 'burn_address'],
    },
    {
      fields: ['winery_id', 'read'],
    },
  ],
});

export default Notification;