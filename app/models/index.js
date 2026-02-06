// app/models/index.js
// Centraliza la importación y relación de modelos

import User from './User.js';
import Wallet from './Wallet.js';

User.hasMany(Wallet, { foreignKey: 'usuario_id' });
Wallet.belongsTo(User, { foreignKey: 'usuario_id' });

export { User, Wallet };
