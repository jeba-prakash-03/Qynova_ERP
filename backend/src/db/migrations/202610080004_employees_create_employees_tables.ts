import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employees', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('employee_code', 50).notNullable().unique();
    table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('photo_url', 500).nullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50).nullable();
    table.date('date_of_birth').nullable();
    table.text('address').nullable();
    table.bigInteger('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('RESTRICT');
    table.bigInteger('designation_id').unsigned().nullable().references('id').inTable('designations').onDelete('RESTRICT');
    table.bigInteger('reporting_manager_id').unsigned().nullable().references('id').inTable('employees').onDelete('RESTRICT');
    table.date('joining_date').notNullable();
    table.enum('employment_type', ['full_time', 'intern', 'contract']).notNullable().defaultTo('full_time');
    table.enum('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table
      .enum('lifecycle_stage', [
        'candidate',
        'selected',
        'offer_generated',
        'offer_accepted',
        'onboarding',
        'active',
        'probation',
        'confirmed',
        'resigned',
        'notice_period',
        'relieved',
      ])
      .notNullable()
      .defaultTo('active');
    table.json('skills').nullable();
    table.decimal('experience_years', 4, 1).notNullable().defaultTo(0.0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.timestamp('deleted_at').nullable();
    table.index(['user_id']);
    table.index(['department_id']);
    table.index(['designation_id']);
    table.index(['reporting_manager_id']);
    table.index(['status']);
    table.index(['lifecycle_stage']);
  });

  await knex.schema.createTable('employee_bank_details', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    table.string('account_holder', 150).notNullable();
    table.string('bank_name', 150).notNullable();
    table.string('account_number', 100).notNullable();
    table.string('ifsc', 50).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['employee_id']);
  });

  await knex.schema.createTable('employee_emergency_contacts', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    table.string('contact_name', 150).notNullable();
    table.string('relationship', 100).notNullable();
    table.string('phone', 50).notNullable();
    table.string('alt_phone', 50).nullable();
    table.text('address').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.index(['employee_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_emergency_contacts');
  await knex.schema.dropTableIfExists('employee_bank_details');
  await knex.schema.dropTableIfExists('employees');
}
