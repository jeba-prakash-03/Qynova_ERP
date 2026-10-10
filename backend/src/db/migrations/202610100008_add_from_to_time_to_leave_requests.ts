import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasFromTime = await knex.schema.hasColumn('leave_requests', 'from_time');
  if (!hasFromTime) {
    await knex.schema.alterTable('leave_requests', (table) => {
      table.string('from_time', 10).nullable();
      table.string('to_time', 10).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasFromTime = await knex.schema.hasColumn('leave_requests', 'from_time');
  if (hasFromTime) {
    await knex.schema.alterTable('leave_requests', (table) => {
      table.dropColumn('from_time');
      table.dropColumn('to_time');
    });
  }
}
