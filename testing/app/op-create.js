// op-create.js
// Script para crear un usuario y wallet de prueba

import { User, Wallet } from '../../app/models/index.js';
import sequelize from '../../app/config/database.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Conexión establecida.');

    // Crear usuario ficticio
    const user = await User.create({
      id: 'oauth_test_99',
      provider: 'google',
      role: 'winery',
      nombre: 'Bodega Experimental',
      email: 'experimental@wine.test',
      categorias: ['Experimental', 'Innovación'],
      kyc_status: 'pending',
      subscription_type: 'trial',
      registrado: true,
      descripcion: 'Usuario de prueba para validación de CRUD.'
    });
    console.log('Usuario creado:', user.id);

    // Crear wallet asociada
    const wallet = await Wallet.create({
      id: 'w_test_99',
      address: '0xEXPERIMENTALWINE99',
      status: 'active',
      type: 'bodega',
      usuario_id: user.id,
      fecha_vinculacion: new Date()
    });
    console.log('Wallet creada:', wallet.address);
  } catch (error) {
    console.error('Error en op-create:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada.');
  }
}

main();
