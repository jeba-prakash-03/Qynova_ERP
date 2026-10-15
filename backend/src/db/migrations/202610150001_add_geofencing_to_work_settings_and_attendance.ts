import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add geofencing columns to work_settings table
  const hasWorkSettings = await knex.schema.hasTable('work_settings');
  if (hasWorkSettings) {
    await knex.schema.alterTable('work_settings', (table) => {
      table.boolean('geofencing_enabled').notNullable().defaultTo(false);
      table.string('office_name', 255).nullable();
      table.decimal('office_latitude', 10, 7).nullable();
      table.decimal('office_longitude', 10, 7).nullable();
      table.integer('office_radius_meters').notNullable().defaultTo(100);
      table.integer('min_location_accuracy_meters').notNullable().defaultTo(50);
    });
  }

  // 2. Create office_locations table (supports multiple office locations)
  const hasOfficeLocations = await knex.schema.hasTable('office_locations');
  if (!hasOfficeLocations) {
    await knex.schema.createTable('office_locations', (table) => {
      table.bigIncrements('id').primary();
      table.string('name', 255).notNullable();
      table.decimal('latitude', 10, 7).notNullable();
      table.decimal('longitude', 10, 7).notNullable();
      table.integer('radius_meters').notNullable().defaultTo(100);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 3. Add check-in location audit columns to attendance table
  const hasAttendance = await knex.schema.hasTable('attendance');
  if (hasAttendance) {
    await knex.schema.alterTable('attendance', (table) => {
      table.decimal('check_in_latitude', 10, 7).nullable();
      table.decimal('check_in_longitude', 10, 7).nullable();
      table.decimal('check_in_accuracy', 8, 2).nullable();
      table.decimal('check_in_distance_meters', 8, 2).nullable();
      table
        .bigInteger('office_location_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('office_locations')
        .onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasAttendance = await knex.schema.hasTable('attendance');
  if (hasAttendance) {
    await knex.schema.alterTable('attendance', (table) => {
      table.dropForeign(['office_location_id']);
      table.dropColumn('office_location_id');
      table.dropColumn('check_in_distance_meters');
      table.dropColumn('check_in_accuracy');
      table.dropColumn('check_in_longitude');
      table.dropColumn('check_in_latitude');
    });
  }

  await knex.schema.dropTableIfExists('office_locations');

  const hasWorkSettings = await knex.schema.hasTable('work_settings');
  if (hasWorkSettings) {
    await knex.schema.alterTable('work_settings', (table) => {
      table.dropColumn('min_location_accuracy_meters');
      table.dropColumn('office_radius_meters');
      table.dropColumn('office_longitude');
      table.dropColumn('office_latitude');
      table.dropColumn('office_name');
      table.dropColumn('geofencing_enabled');
    });
  }
}
