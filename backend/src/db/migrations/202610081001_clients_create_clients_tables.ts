import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('clients', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('client_code', 50).notNullable().unique();
    table.string('company_name', 255).notNullable();
    table.string('industry', 100).nullable();
    table.string('website', 255).nullable();
    table.string('gstin', 50).nullable();
    table.enum('status', ['active', 'inactive', 'lead']).notNullable().defaultTo('active');
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.timestamp('deleted_at').nullable();
    table.index(['company_name']);
    table.index(['status']);
    table.index(['deleted_at']);
  });

  await knex.schema.createTable('client_contacts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('client_id').unsigned().notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('designation', 100).nullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50).nullable();
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['client_id']);
  });

  await knex.schema.createTable('client_addresses', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('client_id').unsigned().notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.enum('type', ['billing', 'office']).notNullable().defaultTo('office');
    table.string('line1', 255).notNullable();
    table.string('line2', 255).nullable();
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('pincode', 20).notNullable();
    table.string('country', 100).notNullable().defaultTo('India');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['client_id']);
  });

  await knex.schema.createTable('client_communications', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('client_id').unsigned().notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.enum('type', ['call', 'email', 'meeting', 'note']).notNullable();
    table.text('summary').notNullable();
    table.date('date').notNullable();
    table.bigInteger('created_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['client_id']);
    table.index(['created_by']);
    table.index(['date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client_communications');
  await knex.schema.dropTableIfExists('client_addresses');
  await knex.schema.dropTableIfExists('client_contacts');
  await knex.schema.dropTableIfExists('clients');
}
