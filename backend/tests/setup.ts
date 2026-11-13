import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test_super_secret_jwt_access_key_min_32_chars_long!';
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = 'test_super_secret_jwt_refresh_key_min_32_chars_long!';
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
