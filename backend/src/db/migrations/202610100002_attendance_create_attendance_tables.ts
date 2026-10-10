import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. attendance table
  await knex.schema.createTable('attendance', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('employee_id').unsigned().notNullable()
      .references('id').inTable('employees').onDelete('RESTRICT');
    table.date('date').notNullable();
    table.datetime('check_in').nullable();
    table.datetime('check_out').nullable();
    table.enum('status', [
      'present',
      'absent',
      'half_day',
      'leave',
      'holiday',
      'weekend',
      'wfh',
    ]).notNullable().defaultTo('present');
    table.enum('work_type', ['office', 'wfh']).notNullable().defaultTo('office');
    table.integer('working_minutes').notNullable().defaultTo(0);
    table.integer('break_minutes').notNullable().defaultTo(0);
    table.integer('overtime_minutes').notNullable().defaultTo(0);
    table.boolean('is_late').notNullable().defaultTo(false);
    table.boolean('is_early_checkout').notNullable().defaultTo(false);
    table.text('remarks').nullable();
    table.bigInteger('edited_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    table.unique(['employee_id', 'date']);
    table.index(['date', 'status']);
  });

  // 2. attendance_breaks table
  await knex.schema.createTable('attendance_breaks', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('attendance_id').unsigned().notNullable()
      .references('id').inTable('attendance').onDelete('CASCADE');
    table.datetime('break_start').notNullable();
    table.datetime('break_end').nullable();
    table.timestamps(true, true);

    table.index(['attendance_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_breaks');
  await knex.schema.dropTableIfExists('attendance');
}
