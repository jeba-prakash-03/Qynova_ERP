import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. holidays table
  await knex.schema.createTable('holidays', (table) => {
    table.bigIncrements('id').primary();
    table.date('date').notNullable().unique();
    table.string('name', 255).notNullable();
    table.enum('type', ['public', 'company', 'optional']).notNullable().defaultTo('public');
    table.timestamps(true, true);
  });

  // 2. work_settings table
  await knex.schema.createTable('work_settings', (table) => {
    table.bigIncrements('id').primary();
    table.json('weekly_off_days').notNullable(); // [0, 6] (Sunday=0, Saturday=6)
    table.string('shift_start', 5).notNullable().defaultTo('09:30');
    table.string('shift_end', 5).notNullable().defaultTo('18:30');
    table.integer('late_grace_minutes').notNullable().defaultTo(10);
    table.decimal('min_hours_full_day', 4, 2).notNullable().defaultTo(8.0);
    table.decimal('min_hours_half_day', 4, 2).notNullable().defaultTo(4.0);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_settings');
  await knex.schema.dropTableIfExists('holidays');
}
