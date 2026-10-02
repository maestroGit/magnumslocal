// app/models/BurnEvent.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BurnEvent = sequelize.define('BurnEvent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tx_id: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  burn_address: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  amount: {
    type: DataTypes.NUMERIC,
    allowNull: false
  },
  genesis_hash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'burn_events',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['tx_id']
    },
    {
      fields: ['genesis_hash']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default BurnEvent;
