import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 100).notNullable().unique();
    table.string('description', 255).nullable();
    table.boolean('is_system').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  await knex.schema.createTable('permissions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('module', 100).notNullable();
    table.string('action', 50).notNullable();
    table.string('name', 150).notNullable().unique();
    table.string('description', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['module']);
  });

  await knex.schema.createTable('role_permissions', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.bigInteger('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['role_id', 'permission_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_roles', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.unique(['user_id', 'role_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
}
