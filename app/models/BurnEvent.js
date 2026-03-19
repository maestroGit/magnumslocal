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
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'burn_events',
  timestamps: false
});

export default BurnEvent;
