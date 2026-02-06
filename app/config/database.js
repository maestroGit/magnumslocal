// app/config/database.js
// DB architect + js-modules skill

import { Sequelize } from 'sequelize';
import 'dotenv/config';

const {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT
} = process.env;

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
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
});

export default sequelize;
