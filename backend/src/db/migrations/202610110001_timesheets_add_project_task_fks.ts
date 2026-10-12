import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTimesheets = await knex.schema.hasTable('timesheets');
  if (hasTimesheets) {
    const hasProjectId = await knex.schema.hasColumn('timesheets', 'project_id');
    const hasTaskId = await knex.schema.hasColumn('timesheets', 'task_id');

    await knex.schema.alterTable('timesheets', (table) => {
      if (!hasProjectId) {
        table
          .bigInteger('project_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('projects')
          .onDelete('SET NULL');
      }
      if (!hasTaskId) {
        table.bigInteger('task_id').unsigned().nullable();
      }
    });
  }

  // Support timesheet_entries table if present
  const hasTimesheetEntries = await knex.schema.hasTable('timesheet_entries');
  if (hasTimesheetEntries) {
    const hasProjectId = await knex.schema.hasColumn('timesheet_entries', 'project_id');
    const hasTaskId = await knex.schema.hasColumn('timesheet_entries', 'task_id');

    await knex.schema.alterTable('timesheet_entries', (table) => {
      if (!hasProjectId) {
        table
          .bigInteger('project_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('projects')
          .onDelete('SET NULL');
      }
      if (!hasTaskId) {
        table.bigInteger('task_id').unsigned().nullable();
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTimesheets = await knex.schema.hasTable('timesheets');
  if (hasTimesheets) {
    const hasProjectId = await knex.schema.hasColumn('timesheets', 'project_id');
    if (hasProjectId) {
      try {
        await knex.schema.alterTable('timesheets', (table) => {
          table.dropForeign(['project_id']);
          table.dropColumn('project_id');
        });
      } catch {
        // Ignore if foreign key was not present
      }
    }
    const hasTaskId = await knex.schema.hasColumn('timesheets', 'task_id');
    if (hasTaskId) {
      await knex.schema.alterTable('timesheets', (table) => {
        table.dropColumn('task_id');
      });
    }
  }
}
