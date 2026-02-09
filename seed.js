/**
 * SEED.JS - Script de Poblamiento Inicial
 * * UBICACIÓN: Raíz del proyecto. 
 * POR QUÉ: Se mantiene en la raíz por ser un script de despliegue y mantenimiento estándar.
 * Al estar fuera de /app, facilita su ejecución directa en entornos de producción (CI/CD)
 * para inicializar la base de datos sin depender de la lógica del servidor Express.
 * * FUNCIÓN: Registra los datos maestros (bodegas de confianza, wallets oficiales) necesarios
 * para que la aplicación sea funcional tras una instalación limpia.
 */

import { User, Wallet } from './app/models/index.js';
import sequelize from './app/config/database.js';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida con Seenode.');

    // --- OPCIONAL: Limpieza ---
    // Cuidado: Esto borra los datos antes de insertar. Úsalo solo en desarrollo.
    // await Wallet.destroy({ where: {} });
    // await User.destroy({ where: {} });
    // console.log('🗑️ Tablas de prueba limpiadas.');

    // 1. Uso de findOrCreate para evitar errores de duplicado
    const [user, createdUser] = await User.findOrCreate({
      where: { id: 'google-oauth2|123456789' },
      defaults: {
        provider: 'google',
        role: 'winery',
        nombre: 'Bodega Los Maestros',
        email: 'info@maestros.wine',
        categorias: ['Vino Tinto', 'Reserva', 'Ecológico'],
        kyc_status: 'approved',
        subscription_type: 'business',
        registrado: true
      }
    });

    if (createdUser) {
      console.log('👤 Usuario creado:', user.id);
    } else {
      console.log('ℹ️ El usuario ya existía, se omitió la creación.');
    }

    // 2. Crear o actualizar Wallet asociada
    const [wallet, createdWallet] = await Wallet.findOrCreate({
      where: { address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      defaults: {
        id: 'w_maestros',
        status: 'active',
        type: 'bodega',
        usuario_id: user.id,
        fecha_vinculacion: new Date()
      }
    });

    if (createdWallet) {
      console.log('💳 Wallet creada:', wallet.address);
    } else {
      console.log('ℹ️ La wallet ya estaba registrada.');
    }

    console.log('🚀 Seed finalizado con éxito.');

  } catch (error) {
    console.error('❌ Error en seed:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada.');
  }
}

seed();