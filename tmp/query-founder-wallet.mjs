import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'c:/Users/maest/Documents/magnumslocal/.env' });

const { Client } = pg;
const founderAddress = '04b2201e73f77a7fb6a1bbd401cb1ab128bb5128d69ee5f33c5e6657e4609c4ffb17d2abc868e3d3073f2c64d0e14d943e878b9c58d008fc37c441af8db5f45adb';

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const linked = await client.query(
  `SELECT u.id, u.nombre, u.email, u.role, u.provider,
          w.id AS wallet_id, w.address, w.status, w.type
   FROM wallets w
   LEFT JOIN usuarios u ON u.id = w.usuario_id
   WHERE w.address = $1`,
  [founderAddress]
);

const linkedAdmin = await client.query(
  `SELECT u.id, u.nombre, u.email, u.role, w.address
   FROM usuarios u
   JOIN wallets w ON w.usuario_id = u.id
   WHERE u.role = 'admin' AND w.address = $1`,
  [founderAddress]
);

console.log('=== WALLET FUNDADORA (BLOQUE 0) ===');
console.table(linked.rows);
console.log('admin_vinculado_count =', linkedAdmin.rowCount);

await client.end();
