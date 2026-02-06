// op-update.js
// Script para actualizar usuario oauth_015

import { User } from './app/models/index.js';
import sequelize from './app/config/database.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Conexión establecida.');

    const user = await User.findByPk('oauth_test_99');
    if (!user) {
      console.log('Usuario oauth_test_99 no encontrado.');
      return;
    }
    user.kyc_status = 'approved';
    user.descripcion = 'KYC validado y descripción actualizada por op-update.js';
    await user.save();
    console.log('Usuario actualizado:', user.id);
  } catch (error) {
    console.error('Error en op-update:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada.');
  }
}

main();
