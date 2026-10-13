import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

import fs from 'fs';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envPath = path.resolve(__dirname, `../../${envFile}`);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '7868',
      database: process.env.DB_NAME || 'qynova_erp',
      timezone: '+00:00',
      dateStrings: true,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.resolve(__dirname, './migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.resolve(__dirname, './seeds/essential'),
      extension: 'ts',
    },
  },
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '7868',
      database: process.env.DB_NAME || 'qynova_test',
      timezone: '+00:00',
      dateStrings: true,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.resolve(__dirname, './migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.resolve(__dirname, './seeds/essential'),
      extension: 'ts',
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: '+00:00',
    },
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.resolve(__dirname, './migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, './seeds/essential'),
    },
  },
};

export default config;
