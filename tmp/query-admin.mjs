import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

import pkg from 'pg';
const { Client } = pkg;

const FOUNDER_WALLET = '04325e339641e1def136cfa8ab904f88e8ffaa46a692b4992d71e6048a1ba964272c28a00490d39fbcef990093998a3717d9a6b8e16f7ab430af40f8cd158438cd';

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
console.log('✅ Conectado a la DB');

// Usuario vinculado a la wallet fundadora
const founder = await client.query(`
  SELECT u.id, u.nombre, u.email, u.role, u.provider,
         (u.password_hash IS NOT NULL) AS tiene_password,
         w.id AS wallet_id, w.address AS wallet_address, w.status AS wallet_status, w.type AS wallet_type
  FROM usuarios u
  JOIN wallets w ON w.usuario_id = u.id
  WHERE w.address = $1
`, [FOUNDER_WALLET]);
console.log('\n=== USUARIO VINCULADO A WALLET FUNDADORA ===');
console.table(founder.rows);

// Todos los usuarios y sus roles
const all = await client.query(`
  SELECT id, nombre, email, role, provider
  FROM usuarios
  ORDER BY fecha_registro DESC
  LIMIT 15
`);
console.log('\n=== TODOS LOS USUARIOS (últimos 15) ===');
console.table(all.rows);

await client.end();
console.log('\n🔌 Conexión cerrada');
