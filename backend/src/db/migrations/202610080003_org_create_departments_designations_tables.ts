import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('departments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 150).notNullable();
    table.string('code', 50).notNullable().unique();
    table.bigInteger('parent_id').unsigned().nullable().references('id').inTable('departments').onDelete('RESTRICT');
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.timestamp('deleted_at').nullable();
  });

  await knex.schema.createTable('designations', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 150).notNullable();
    table.string('code', 50).notNullable().unique();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.timestamp('deleted_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('designations');
  await knex.schema.dropTableIfExists('departments');
}
