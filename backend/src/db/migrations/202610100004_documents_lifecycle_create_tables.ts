import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Ensure users.status enum includes 'disabled'
  await knex.raw(
    "ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive', 'disabled') NOT NULL DEFAULT 'active'"
  );

  // 2. employee_documents table
  await knex.schema.createTable('employee_documents', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table
      .enum('type', [
        'aadhaar',
        'pan',
        'resume',
        'offer_letter',
        'joining_letter',
        'experience_letter',
        'salary_document',
        'certificate',
        'other',
      ])
      .notNullable();
    table.string('file_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('mime_type', 100).notNullable();
    table.bigInteger('size').notNullable();
    table
      .bigInteger('uploaded_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['employee_id']);
    table.index(['type']);
  });

  // 3. employee_lifecycle_history table
  await knex.schema.createTable('employee_lifecycle_history', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table.string('from_stage', 50).notNullable();
    table.string('to_stage', 50).notNullable();
    table
      .bigInteger('changed_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('note').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['employee_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_lifecycle_history');
  await knex.schema.dropTableIfExists('employee_documents');
  if (await knex.schema.hasTable('users')) {
    await knex('users')
      .whereNotIn('status', ['active', 'inactive'])
      .update({ status: 'inactive' });
    await knex.raw(
      "ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'"
    );
  }
}
