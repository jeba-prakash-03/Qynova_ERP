import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. assets table
  if (!(await knex.schema.hasTable('assets'))) {
    await knex.schema.createTable('assets', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('asset_tag', 100).notNullable().unique();
      table.string('name', 255).notNullable();
      table.string('category', 100).notNullable().defaultTo('laptop');
      table.string('model', 255).nullable();
      table.string('serial_number', 255).nullable();
      table.date('purchase_date').nullable();
      table.decimal('purchase_cost', 12, 2).nullable();
      table.enum('status', ['available', 'assigned', 'maintenance', 'retired']).defaultTo('available').notNullable();
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }

  // 2. asset_assignments table
  if (!(await knex.schema.hasTable('asset_assignments'))) {
    await knex.schema.createTable('asset_assignments', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('asset_id').unsigned().notNullable().references('id').inTable('assets').onDelete('CASCADE');
      table.bigInteger('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
      table.date('assigned_date').notNullable();
      table.date('returned_date').nullable();
      table.string('condition_assigned', 255).nullable();
      table.string('condition_returned', 255).nullable();
      table.bigInteger('assigned_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 3. asset_maintenance table
  if (!(await knex.schema.hasTable('asset_maintenance'))) {
    await knex.schema.createTable('asset_maintenance', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.bigInteger('asset_id').unsigned().notNullable().references('id').inTable('assets').onDelete('CASCADE');
      table.date('start_date').notNullable();
      table.date('end_date').nullable();
      table.decimal('cost', 10, 2).defaultTo(0).notNullable();
      table.text('issue_description').notNullable();
      table.text('resolution_details').nullable();
      table.string('vendor_name', 255).nullable();
      table.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled']).defaultTo('in_progress').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('asset_maintenance');
  await knex.schema.dropTableIfExists('asset_assignments');
  await knex.schema.dropTableIfExists('assets');
}
