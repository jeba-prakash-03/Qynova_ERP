import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. email_outbox table
  if (!(await knex.schema.hasTable('email_outbox'))) {
    await knex.schema.createTable('email_outbox', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('to', 255).notNullable();
      table.string('subject', 255).notNullable();
      table.text('html', 'longtext').notNullable();
      table.enum('status', ['pending', 'sent', 'failed']).defaultTo('pending').notNullable();
      table.integer('attempts').defaultTo(0).notNullable();
      table.text('last_error').nullable();
      table.string('event_key', 255).nullable().unique();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 2. notification_preferences table
  if (!(await knex.schema.hasTable('notification_preferences'))) {
    await knex.schema.createTable('notification_preferences', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('event_type', 100).notNullable();
      table.boolean('email_enabled').defaultTo(true).notNullable();
      table.boolean('in_app_enabled').defaultTo(true).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'event_type']);
    });
  }

  // 3. password_reset_tokens table
  if (!(await knex.schema.hasTable('password_reset_tokens'))) {
    await knex.schema.createTable('password_reset_tokens', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash', 255).notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('used_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('email_outbox');
}
