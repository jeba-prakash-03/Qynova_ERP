import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. leave_types table
  await knex.schema.createTable('leave_types', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 100).notNullable();
    table.string('code', 50).notNullable().unique();
    table.decimal('yearly_quota', 5, 1).notNullable().defaultTo(0);
    table.boolean('is_paid').notNullable().defaultTo(true);
    table.boolean('carry_forward').notNullable().defaultTo(false);
    table.boolean('requires_approval').notNullable().defaultTo(true);
    table.boolean('allow_half_day').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  // 2. leave_balances table
  await knex.schema.createTable('leave_balances', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table
      .bigInteger('leave_type_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('leave_types')
      .onDelete('CASCADE');
    table.integer('year').notNullable();
    table.decimal('allocated', 5, 1).notNullable().defaultTo(0);
    table.decimal('used', 5, 1).notNullable().defaultTo(0);
    table.decimal('pending', 5, 1).notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['employee_id', 'leave_type_id', 'year'], {
      indexName: 'idx_employee_leave_type_year_unique',
    });
    table.index(['employee_id']);
  });

  // 3. leave_requests table
  await knex.schema.createTable('leave_requests', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table
      .bigInteger('leave_type_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('leave_types')
      .onDelete('CASCADE');
    table.date('from_date').notNullable();
    table.date('to_date').notNullable();
    table.boolean('is_half_day').notNullable().defaultTo(false);
    table.enum('half_day_session', ['first', 'second']).nullable();
    table.decimal('days', 4, 1).notNullable();
    table.text('reason').notNullable();
    table
      .enum('status', ['pending', 'approved', 'rejected', 'cancelled'])
      .notNullable()
      .defaultTo('pending');
    table
      .bigInteger('approver_employee_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('employees')
      .onDelete('SET NULL');
    table.timestamp('decided_at').nullable();
    table.text('decision_note').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id']);
    table.index(['status']);
    table.index(['from_date', 'to_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('leave_balances');
  await knex.schema.dropTableIfExists('leave_types');
}
