import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add adjustment and PF columns to payroll_items if they don't exist
  const hasIncentives = await knex.schema.hasColumn('payroll_items', 'incentives');
  if (!hasIncentives) {
    await knex.schema.alterTable('payroll_items', (table) => {
      table.decimal('incentives', 12, 2).defaultTo(0);
      table.decimal('bonus', 12, 2).defaultTo(0);
      table.decimal('allowances', 12, 2).defaultTo(0);
      table.decimal('overtime', 12, 2).defaultTo(0);
      table.decimal('pf_deduction', 12, 2).defaultTo(0);
      table.decimal('other_deductions', 12, 2).defaultTo(0);
    });
  }

  // 2. Create payroll_adjustments table for admin pre-run configurations
  const hasAdjustmentsTable = await knex.schema.hasTable('payroll_adjustments');
  if (!hasAdjustmentsTable) {
    await knex.schema.createTable('payroll_adjustments', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table
        .bigInteger('employee_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE');
      table.string('month', 7).notNullable(); // YYYY-MM
      table.decimal('incentives', 12, 2).defaultTo(0);
      table.decimal('bonus', 12, 2).defaultTo(0);
      table.decimal('allowances', 12, 2).defaultTo(0);
      table.decimal('overtime', 12, 2).defaultTo(0);
      table.decimal('pf', 12, 2).nullable(); // null means auto calculate 12%
      table.decimal('other_deductions', 12, 2).defaultTo(0);
      table.string('note', 255).nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamps(true, true);

      table.unique(['employee_id', 'month']);
      table.index(['month']);
    });
  }

  // 3. Update status enums to include 'processed'
  try {
    await knex.raw(
      "ALTER TABLE payroll_runs MODIFY COLUMN status ENUM('draft', 'processed', 'processing', 'locked', 'approved', 'paid') NOT NULL DEFAULT 'draft'"
    );
    await knex.raw(
      "ALTER TABLE payroll_items MODIFY COLUMN status ENUM('draft', 'processed', 'locked', 'paid') NOT NULL DEFAULT 'draft'"
    );
  } catch {
    // If not MySQL or alter fails, continue
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_adjustments');
  const hasIncentives = await knex.schema.hasColumn('payroll_items', 'incentives');
  if (hasIncentives) {
    await knex.schema.alterTable('payroll_items', (table) => {
      table.dropColumn('incentives');
      table.dropColumn('bonus');
      table.dropColumn('allowances');
      table.dropColumn('overtime');
      table.dropColumn('pf_deduction');
      table.dropColumn('other_deductions');
    });
  }
}
