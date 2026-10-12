import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Expense Categories Table
  await knex.schema.createTable('expense_categories', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('name', 100).notNullable().unique();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  // 2. Expenses Table
  await knex.schema.createTable('expenses', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('expense_code', 50).notNullable().unique();
    table
      .bigInteger('category_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('expense_categories')
      .onDelete('SET NULL');
    table.string('category', 100).notNullable();
    table
      .bigInteger('project_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('projects')
      .onDelete('SET NULL');
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.date('date').notNullable();
    table.string('vendor', 255).nullable();
    table.text('description').nullable();
    table.string('receipt_url', 500).nullable();
    table
      .enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'paid'])
      .notNullable()
      .defaultTo('pending_approval');
    table
      .bigInteger('approved_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('employees')
      .onDelete('SET NULL');
    table.timestamp('approved_at').nullable();
    table.text('rejection_reason').nullable();
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
    table.index(['employee_id']);
    table.index(['category_id']);
    table.index(['status']);
    table.index(['date']);
  });

  // 3. Invoices Table
  await knex.schema.createTable('invoices', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('invoice_number', 50).notNullable().unique();
    table
      .bigInteger('client_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('clients')
      .onDelete('RESTRICT');
    table
      .bigInteger('project_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('projects')
      .onDelete('SET NULL');
    table
      .bigInteger('milestone_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('project_milestones')
      .onDelete('SET NULL');
    table.date('issue_date').notNullable();
    table.date('due_date').notNullable();
    table.decimal('subtotal', 12, 2).notNullable().defaultTo(0.0);
    table.decimal('tax_percent', 5, 2).notNullable().defaultTo(18.0);
    table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0.0);
    table.decimal('total', 12, 2).notNullable().defaultTo(0.0);
    table.decimal('amount_paid', 12, 2).notNullable().defaultTo(0.0);
    table
      .enum('status', [
        'draft',
        'sent',
        'viewed',
        'partially_paid',
        'paid',
        'overdue',
        'cancelled',
      ])
      .notNullable()
      .defaultTo('draft');
    table.text('notes').nullable();
    table.text('terms').nullable();
    table
      .bigInteger('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['client_id']);
    table.index(['project_id']);
    table.index(['milestone_id']);
    table.index(['status']);
    table.index(['due_date']);
  });

  // 4. Invoice Items Table
  await knex.schema.createTable('invoice_items', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('invoice_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('invoices')
      .onDelete('CASCADE');
    table.text('description').notNullable();
    table.decimal('quantity', 8, 2).notNullable().defaultTo(1.0);
    table.decimal('unit_price', 12, 2).notNullable().defaultTo(0.0);
    table.decimal('amount', 12, 2).notNullable().defaultTo(0.0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['invoice_id']);
  });

  // 5. Payments Table
  await knex.schema.createTable('payments', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('payment_number', 50).notNullable().unique();
    table
      .bigInteger('invoice_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('invoices')
      .onDelete('RESTRICT');
    table.decimal('amount', 12, 2).notNullable();
    table.date('payment_date').notNullable();
    table
      .enum('method', ['bank_transfer', 'upi', 'credit_card', 'cheque', 'cash', 'other'])
      .notNullable()
      .defaultTo('bank_transfer');
    table.string('reference', 100).nullable();
    table.text('notes').nullable();
    table
      .bigInteger('recorded_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['invoice_id']);
    table.index(['payment_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('expense_categories');
}
