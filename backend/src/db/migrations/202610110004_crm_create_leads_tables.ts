import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop table if partially created in failed previous attempt
  await knex.schema.dropTableIfExists('lead_activities');
  await knex.schema.dropTableIfExists('leads');

  // 1. Leads Table
  await knex.schema.createTable('leads', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.string('lead_code', 50).notNullable().unique();
    table.string('company_name', 255).notNullable();
    table.string('contact_name', 255).notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 50).nullable();
    table.string('source', 100).nullable();
    table.text('requirement').nullable();
    table.decimal('estimated_value', 12, 2).notNullable().defaultTo(0.00);
    table.integer('probability_percent').notNullable().defaultTo(10);
    table.date('expected_closing_date').nullable();
    table
      .bigInteger('salesperson_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('employees')
      .onDelete('SET NULL');
    table
      .enum('stage', [
        'lead',
        'contact',
        'requirement',
        'meeting',
        'proposal',
        'negotiation',
        'won',
        'lost',
      ])
      .notNullable()
      .defaultTo('lead');
    table.text('lost_reason').nullable();
    table
      .bigInteger('converted_client_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('clients')
      .onDelete('SET NULL');
    table
      .bigInteger('converted_project_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('projects')
      .onDelete('SET NULL');
    table.timestamp('converted_at').nullable();
    table
      .bigInteger('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamps(true, true);

    table.index(['stage']);
    table.index(['salesperson_id']);
  });

  // 2. Lead Activities Table
  await knex.schema.createTable('lead_activities', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table
      .bigInteger('lead_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('leads')
      .onDelete('CASCADE');
    table
      .enum('type', ['call', 'email', 'meeting', 'note', 'stage_change'])
      .notNullable()
      .defaultTo('note');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table
      .bigInteger('performed_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('activity_date').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['lead_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('lead_activities');
  await knex.schema.dropTableIfExists('leads');
}
