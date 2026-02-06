// init-db.js
// Es una herramienta de mantenimiento. 
// Se ejecuta manualmente por ti cuando cambias algo en la base de datos. No es parte del funcionamiento diario de la web
// Inicializa la base de datos y sincroniza modelos en Seenode

import sequelize from './app/config/database.js';
import { User, Wallet } from './app/models/index.js';

async function initDB() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente.');

    console.log('Sincronizando modelos (alterando tablas si es necesario)...');
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados correctamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada.');
  }
}

initDB();
