import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('project_code', 50).notNullable().unique();
    table.bigInteger('client_id').unsigned().notNullable().references('id').inTable('clients').onDelete('RESTRICT');
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.bigInteger('project_manager_id').unsigned().nullable().references('id').inTable('employees').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.decimal('budget', 14, 2).notNullable().defaultTo(0.0);
    table.json('technologies').nullable();
    table.enum('priority', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    table
      .enum('status', [
        'lead',
        'proposal',
        'won',
        'contract',
        'planning',
        'development',
        'testing',
        'uat',
        'deployment',
        'maintenance',
        'completed',
        'on_hold',
        'cancelled',
      ])
      .notNullable()
      .defaultTo('planning');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.timestamp('deleted_at').nullable();
    table.index(['client_id']);
    table.index(['project_manager_id']);
    table.index(['status']);
    table.index(['priority']);
    table.index(['deleted_at']);
  });

  await knex.schema.createTable('project_members', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.bigInteger('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('RESTRICT');
    table
      .enum('role', ['manager', 'team_lead', 'developer', 'qa', 'designer'])
      .notNullable()
      .defaultTo('developer');
    table.integer('allocation_percent').notNullable().defaultTo(100);
    table.date('joined_at').notNullable();
    table.date('left_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.unique(['project_id', 'employee_id']);
    table.index(['employee_id']);
  });

  await knex.schema.createTable('project_milestones', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.date('due_date').notNullable();
    table.decimal('amount', 12, 2).notNullable().defaultTo(0.0);
    table.enum('status', ['pending', 'in_progress', 'completed']).notNullable().defaultTo('pending');
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['project_id']);
    table.index(['status']);
  });

  // Coordination with Dev 2: if timesheets table exists, add FK to projects(id)
  const hasTimesheets = await knex.schema.hasTable('timesheets');
  if (hasTimesheets) {
    const hasColumn = await knex.schema.hasColumn('timesheets', 'project_id');
    if (hasColumn) {
      await knex.schema.alterTable('timesheets', (table) => {
        table.foreign('project_id').references('id').inTable('projects').onDelete('RESTRICT');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTimesheets = await knex.schema.hasTable('timesheets');
  if (hasTimesheets) {
    const hasColumn = await knex.schema.hasColumn('timesheets', 'project_id');
    if (hasColumn) {
      try {
        await knex.schema.alterTable('timesheets', (table) => {
          table.dropForeign(['project_id']);
        });
      } catch {
        // foreign key may not exist
      }
    }
  }

  await knex.schema.dropTableIfExists('project_milestones');
  await knex.schema.dropTableIfExists('project_members');
  await knex.schema.dropTableIfExists('projects');
}
