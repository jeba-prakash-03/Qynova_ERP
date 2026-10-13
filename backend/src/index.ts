import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import db from './db/knex';

const PORT = Number(process.env.PORT) || 5000;
const app = createApp();

const startServer = async () => {
  try {
    // Test database connection
    await db.raw('SELECT 1+1 AS result');
    console.log('[DATABASE] MySQL connection established successfully.');

    // In production or when AUTO_MIGRATE is true, ensure migrations and initial seeds are applied
    if (process.env.AUTO_MIGRATE === 'true' || process.env.NODE_ENV === 'production') {
      console.log('[DATABASE] Ensuring database migrations are up to date...');
      await db.migrate.latest();
      console.log('[DATABASE] Database migrations up to date.');

      try {
        const userCount = await db('users').count('* as c').first();
        if (!userCount || Number(userCount.c) === 0) {
          console.log('[DATABASE] Fresh database detected. Running initial seeds...');
          await db.seed.run();
          console.log('[DATABASE] Database seeding complete.');
        }
      } catch (seedErr) {
        console.warn('[DATABASE] Seed check warning:', seedErr);
      }
    }

    // Initialize business cron jobs
    const { initTasksCron } = await import('./modules/tasks/tasks.cron');
    const { initInvoicesCron } = await import('./modules/invoices/invoices.cron');
    const { initOfferLettersCron } = await import('./modules/offer-letters/offer-letters.cron');
    initTasksCron();
    initInvoicesCron();
    initOfferLettersCron();

    app.listen(PORT, () => {
      console.log(`[SERVER] Qynova ERP Backend running on http://localhost:${PORT}`);
      console.log(`[SERVER] API v1 base path: http://localhost:${PORT}/api/v1`);
    });

    // Start background email outbox worker (every 60s)
    if (process.env.NODE_ENV !== 'test') {
      import('./shared/services/email.service').then(({ emailService }) => {
        setInterval(async () => {
          try {
            await emailService.processOutbox();
          } catch (workerErr) {
            console.error('[EMAIL_WORKER_ERROR]', workerErr);
          }
        }, 60000);
      });
    }
  } catch (error) {
    console.error('[SERVER_ERROR] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
