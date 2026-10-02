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
  first_seen_source: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'unknown',
  },
  last_seen_source: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'unknown',
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
  genesis_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
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
    {
      fields: ['genesis_hash'],
    },
    {
      fields: ['is_active'],
    },
  ],
});

export default Notification;