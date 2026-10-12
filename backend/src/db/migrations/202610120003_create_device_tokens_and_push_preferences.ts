import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. device_tokens table
  if (!(await knex.schema.hasTable('device_tokens'))) {
    await knex.schema.createTable('device_tokens', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token', 500).notNullable().unique();
      table.enum('platform', ['web', 'android', 'ios']).defaultTo('web').notNullable();
      table.text('user_agent').nullable();
      table.timestamp('last_used_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('deleted_at').nullable();

      table.index(['user_id', 'deleted_at']);
    });
  }

  // 2. Extend notification_preferences with push_enabled column
  if (await knex.schema.hasTable('notification_preferences')) {
    const hasPushColumn = await knex.schema.hasColumn('notification_preferences', 'push_enabled');
    if (!hasPushColumn) {
      await knex.schema.alterTable('notification_preferences', (table) => {
        table.boolean('push_enabled').defaultTo(true).notNullable().after('in_app_enabled');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('notification_preferences')) {
    const hasPushColumn = await knex.schema.hasColumn('notification_preferences', 'push_enabled');
    if (hasPushColumn) {
      await knex.schema.alterTable('notification_preferences', (table) => {
        table.dropColumn('push_enabled');
      });
    }
  }

  await knex.schema.dropTableIfExists('device_tokens');
}
