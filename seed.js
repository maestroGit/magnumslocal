// seed.js
// Script para poblar la base de datos con un usuario y wallet de prueba

import { User, Wallet } from './app/models/index.js';
import sequelize from './app/config/database.js';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conexión establecida.');

    // Crea usuario tipo bodega
    const user = await User.create({
      id: 'google-oauth2|123456789',
      provider: 'google',
      role: 'winery',
      nombre: 'Bodega Los Maestros',
      email: 'info@maestros.wine',
      categorias: ['Vino Tinto', 'Reserva', 'Ecológico'],
      kyc_status: 'approved',
      subscription_type: 'business',
      registrado: true
    });
    console.log('Usuario creado:', user.id);

    // Crea wallet asociada
    const wallet = await Wallet.create({
      id: 'w_maestros',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      status: 'active',
      type: 'bodega',
      usuario_id: user.id,
      fecha_vinculacion: new Date()
    });
    console.log('Wallet creada:', wallet.address);
  } catch (error) {
    console.error('Error en seed:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada.');
  }
}

seed();
