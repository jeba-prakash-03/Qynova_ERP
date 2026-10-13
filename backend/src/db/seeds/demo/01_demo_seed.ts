import type { Knex } from 'knex';
import { seed as seedOrgEmployees } from './01_org_employees';
import { seed as seedHolidaysAttendance } from './02_holidays_attendance';
import { seed as seedLeaves } from './03_leaves';
import { seed as seedClientsProjects } from './04_clients_projects';
import { seed as seedTasks } from './05_tasks';
import { seed as seedFinance } from './06_finance';
import { seed as seedCrm } from './07_crm';

export async function seed(knex: Knex): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] Refusing to run demo seeds in production environment!');
  }

  console.log('[DEMO_SEED] 1/7 Seeding organization structure, designations, and employees...');
  await seedOrgEmployees(knex);

  console.log('[DEMO_SEED] 2/7 Seeding holidays and sample attendance...');
  await seedHolidaysAttendance(knex);

  console.log('[DEMO_SEED] 3/7 Seeding leave quotas and sample requests...');
  await seedLeaves(knex);

  console.log('[DEMO_SEED] 4/7 Seeding clients and projects...');
  await seedClientsProjects(knex);

  console.log('[DEMO_SEED] 5/7 Seeding tasks and milestones...');
  await seedTasks(knex);

  console.log('[DEMO_SEED] 6/7 Seeding finance, invoices, and expenses...');
  await seedFinance(knex);

  console.log('[DEMO_SEED] 7/7 Seeding CRM leads and activities...');
  await seedCrm(knex);

  console.log('[DEMO_SEED] All demo seed datasets populated successfully.');
}
