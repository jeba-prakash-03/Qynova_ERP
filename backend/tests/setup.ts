import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import db from '../src/db/knex';

beforeAll(async () => {
  const connection = (db.client.config as any).connection;
  const dbName = typeof connection === 'function' ? process.env.DB_NAME : connection?.database || process.env.DB_NAME;
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(
      `CRITICAL GUARD BLOCKED TESTS: Automated tests are prohibited from running against non-test databases. DB_NAME '${dbName}' does not end with '_test'.`
    );
  }
});

afterAll(async () => {
  await db.destroy();
});
