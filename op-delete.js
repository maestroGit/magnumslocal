// op-delete.js
// Script para eliminar usuario oauth_test_99

import { User, Wallet } from './app/models/index.js';
import sequelize from './app/config/database.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Conexión establecida.');

    // Eliminar wallets asociadas primero
    await Wallet.destroy({ where: { usuario_id: 'oauth_test_99' } });
    // Eliminar usuario
    const deleted = await User.destroy({ where: { id: 'oauth_test_99' } });
    if (deleted) {
      console.log('Usuario oauth_test_99 eliminado.');
    } else {
      console.log('Usuario oauth_test_99 no encontrado.');
    }
  } catch (error) {
    console.error('Error en op-delete:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada.');
  }
}

main();
