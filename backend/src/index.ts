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

    // Initialize business cron jobs
    const { initTasksCron } = await import('./modules/tasks/tasks.cron');
    const { initInvoicesCron } = await import('./modules/invoices/invoices.cron');
    initTasksCron();
    initInvoicesCron();

    app.listen(PORT, () => {
      console.log(`[SERVER] Qynova ERP Backend running on http://localhost:${PORT}`);
      console.log(`[SERVER] API v1 base path: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('[SERVER_ERROR] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
