import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import db from '../src/db/knex';

afterAll(async () => {
  await db.destroy();
});
