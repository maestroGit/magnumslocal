// app/config/database.js
// DB architect + js-modules skill

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno (solo si no están ya cargadas)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Solo intenta cargar archivo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  const envFile = '.env';
  const envPath = path.resolve(__dirname, '../../', envFile);
  dotenv.config({ path: envPath });
}

const {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT
} = process.env;

// Inicializar sequelize con valores por defecto si faltan variables
// Esto permite que el server arranque aunque BD no esté disponible
const missingVars = [];
if (!DB_NAME) missingVars.push('DB_NAME');
if (!DB_USER) missingVars.push('DB_USER');
if (!DB_PASSWORD) missingVars.push('DB_PASSWORD');
if (!DB_HOST) missingVars.push('DB_HOST');
if (!DB_PORT) missingVars.push('DB_PORT');

if (missingVars.length > 0) {
  console.warn('⚠️ [DATABASE] Variables de entorno faltantes:', missingVars.join(', '));
  console.warn('   → Los endpoints que usan BD fallarán hasta que se configuren las variables');
}

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  DB_NAME || 'dummy_db',
  DB_USER || 'dummy_user',
  DB_PASSWORD || 'dummy_pass',
  {
    host: DB_HOST || 'localhost',
    port: parseInt(DB_PORT, 10) || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    logging: isProduction ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    }
  }
);

// Probar conexión pero NO fallar si falla
sequelize.authenticate()
  .then(() => {
    console.log('[DATABASE] ✅ Conexión a PostgreSQL establecida');
  })
  .catch(err => {
    console.warn('[DATABASE] ⚠️ No se pudo conectar a PostgreSQL:', err.message);
    console.warn('[DATABASE] → El server arrancará pero los endpoints de BD fallarán');
  });

export default sequelize;
