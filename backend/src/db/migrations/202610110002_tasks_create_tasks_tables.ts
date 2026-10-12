import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Project Modules Table
  await knex.schema.createTable('project_modules', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['project_id']);
  });

  // 2. Tasks Table
  await knex.schema.createTable('tasks', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('task_code', 50).notNullable().unique();
    table
      .bigInteger('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');
    table
      .bigInteger('module_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('project_modules')
      .onDelete('SET NULL');
    table
      .bigInteger('parent_task_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table
      .bigInteger('assignee_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('employees')
      .onDelete('SET NULL');
    table
      .bigInteger('reviewer_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('employees')
      .onDelete('SET NULL');
    table
      .enum('priority', ['low', 'medium', 'high', 'critical'])
      .notNullable()
      .defaultTo('medium');
    table
      .enum('status', [
        'backlog',
        'todo',
        'in_progress',
        'code_review',
        'changes_required',
        'testing',
        'qa_passed',
        'completed',
      ])
      .notNullable()
      .defaultTo('backlog');
    table.date('due_date').nullable();
    table.decimal('estimated_hours', 6, 2).notNullable().defaultTo(0.0);
    table.decimal('actual_hours', 6, 2).notNullable().defaultTo(0.0);
    table
      .bigInteger('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['project_id']);
    table.index(['assignee_id']);
    table.index(['reviewer_id']);
    table.index(['status']);
    table.index(['parent_task_id']);
  });

  // 3. Add FK from timesheets.task_id to tasks.id if timesheets exists
  const hasTimesheets = await knex.schema.hasTable('timesheets');
  if (hasTimesheets) {
    const hasTaskId = await knex.schema.hasColumn('timesheets', 'task_id');
    if (hasTaskId) {
      try {
        await knex.schema.alterTable('timesheets', (table) => {
          table.foreign('task_id').references('id').inTable('tasks').onDelete('SET NULL');
        });
      } catch {
        // foreign key constraint might already exist
      }
    }
  }

  // 4. Task Comments Table
  await knex.schema.createTable('task_comments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('task_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');
    table
      .bigInteger('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('comment').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['task_id']);
    table.index(['user_id']);
  });

  // 5. Task History Table
  await knex.schema.createTable('task_history', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('task_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');
    table
      .bigInteger('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('field_changed', 100).notNullable();
    table.text('old_value').nullable();
    table.text('new_value').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['task_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTimesheets = await knex.schema.hasTable('timesheets');
  if (hasTimesheets) {
    try {
      await knex.schema.alterTable('timesheets', (table) => {
        table.dropForeign(['task_id']);
      });
    } catch {
      // Ignore
    }
  }

  await knex.schema.dropTableIfExists('task_history');
  await knex.schema.dropTableIfExists('task_comments');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('project_modules');
}
