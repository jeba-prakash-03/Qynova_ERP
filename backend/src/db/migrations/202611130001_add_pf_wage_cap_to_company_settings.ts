import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('company_settings');
  if (hasTable) {
    const hasWageCap = await knex.schema.hasColumn('company_settings', 'pf_wage_cap');
    if (!hasWageCap) {
      await knex.schema.alterTable('company_settings', (table) => {
        table.decimal('pf_wage_cap', 12, 2).nullable().defaultTo(15000.0);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('company_settings');
  if (hasTable) {
    const hasWageCap = await knex.schema.hasColumn('company_settings', 'pf_wage_cap');
    if (hasWageCap) {
      await knex.schema.alterTable('company_settings', (table) => {
        table.dropColumn('pf_wage_cap');
      });
    }
  }
}
