import dotenv from 'dotenv';
import pg from 'pg';

const ADDRESS = '04ba6294316f84470d7efe5cf11893fe88fedca4b186642d8758b82cf7878ad059d524aa8e72d32c813d22e3803301f95d365dd78ded56eccd7581ecb23d1472ee';

dotenv.config({ path: 'c:/Users/maest/Documents/magnumslocal/.env' });

const { Client } = pg;
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const summary = await client.query(
  'SELECT wallet_address, utxos_disponibles, balance_disponible, updated_at FROM wallet_utxo_summary WHERE lower(wallet_address)=lower($1)',
  [ADDRESS]
);

const wallet = await client.query(
  'SELECT id,address,usuario_id,status,type FROM wallets WHERE lower(address)=lower($1)',
  [ADDRESS]
);

const user = await client.query(
  'SELECT u.id,u.nombre,u.email,u.role FROM usuarios u JOIN wallets w ON w.usuario_id=u.id WHERE lower(w.address)=lower($1)',
  [ADDRESS]
);

console.log('=== wallet_utxo_summary ===');
console.table(summary.rows);
console.log('=== wallets ===');
console.table(wallet.rows);
console.log('=== usuario vinculado ===');
console.table(user.rows);

await client.end();
