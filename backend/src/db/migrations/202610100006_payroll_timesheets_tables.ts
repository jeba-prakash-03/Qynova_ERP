import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('timesheets');
  await knex.schema.dropTableIfExists('payroll_items');
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.schema.dropTableIfExists('salary_structures');

  // 1. Salary Structures Table
  await knex.schema.createTable('salary_structures', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table.decimal('base_salary', 12, 2).notNullable();
    table.boolean('is_annual').defaultTo(false);
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.bigInteger('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);

    table.index(['employee_id', 'effective_from', 'effective_to']);
  });

  // 2. Payroll Runs Table
  await knex.schema.createTable('payroll_runs', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('month', 7).notNullable().unique(); // YYYY-MM
    table
      .enum('status', ['draft', 'processing', 'locked', 'approved', 'paid'])
      .notNullable()
      .defaultTo('draft');
    table.decimal('total_gross', 14, 2).defaultTo(0);
    table.decimal('total_deductions', 14, 2).defaultTo(0);
    table.decimal('total_net', 14, 2).defaultTo(0);
    table.bigInteger('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // 3. Payroll Items / Payslips Table
  await knex.schema.createTable('payroll_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('payroll_run_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('payroll_runs')
      .onDelete('CASCADE');
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table.decimal('monthly_salary', 12, 2).notNullable();
    table.decimal('daily_salary', 12, 2).notNullable();
    table.integer('working_days_in_month').notNullable();
    table.decimal('approved_leave_days', 4, 1).defaultTo(0);
    table.decimal('absent_days', 4, 1).defaultTo(0);
    table.decimal('free_leave_applied', 4, 1).defaultTo(0);
    table.decimal('lop_days', 4, 1).defaultTo(0);
    table.decimal('gross_earning', 12, 2).notNullable();
    table.decimal('lop_deduction', 12, 2).notNullable();
    table.decimal('net_salary', 12, 2).notNullable();
    table.enum('status', ['draft', 'locked', 'paid']).defaultTo('draft');
    table.timestamps(true, true);

    table.unique(['payroll_run_id', 'employee_id']);
  });

  // 4. Timesheets Table
  await knex.schema.createTable('timesheets', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('hours', 4, 2).notNullable();
    table.text('task_description').notNullable();
    table
      .enum('status', ['pending', 'approved', 'rejected'])
      .notNullable()
      .defaultTo('pending');
    table
      .bigInteger('approver_employee_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('employees')
      .onDelete('SET NULL');
    table.text('decision_note').nullable();
    table.timestamps(true, true);

    table.index(['employee_id', 'date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('timesheets');
  await knex.schema.dropTableIfExists('payroll_items');
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.schema.dropTableIfExists('salary_structures');
}
