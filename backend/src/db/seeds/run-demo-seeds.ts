import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, `../../../${envFile}`) });

if (process.env.NODE_ENV === 'production') {
  console.error('[FATAL] Cannot run demo seeds in production environment!');
  process.exit(1);
}

import db from '../knex';
import { seed as runDemoSeed } from './demo/01_demo_seed';
import { seed as runEssentialSeed } from './essential/01_essential_seed';

async function main() {
  console.log('[DEMO_RUNNER] Starting demo seed runner...');
  try {
    console.log('[DEMO_RUNNER] Ensuring essential foundation seeds are present...');
    await runEssentialSeed(db);
    console.log('[DEMO_RUNNER] Applying demo data...');
    await runDemoSeed(db);
    console.log('[DEMO_RUNNER] Demo seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[DEMO_RUNNER_ERROR]', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
