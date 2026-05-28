import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'c:/Users/maest/Documents/magnumslocal/.env' });

const { Client } = pg;
const email = 'info@bodegastraslascuestas.com';
const imageUrl = 'https://bodegastraslascuestas.com/wp-content/uploads/2023/02/Bodega-Traslascuestas-edificio-exterior-con-lavanda.jpg';

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const before = await client.query(
  'SELECT id, nombre, email, img_bottle, usercard_img FROM usuarios WHERE email = $1',
  [email]
);
console.log('=== BEFORE ===');
console.table(before.rows);

const updated = await client.query(
  'UPDATE usuarios SET img_bottle = $1, usercard_img = $1 WHERE email = $2 RETURNING id, nombre, email, img_bottle, usercard_img',
  [imageUrl, email]
);
console.log('=== UPDATED ===');
console.table(updated.rows);

await client.end();
