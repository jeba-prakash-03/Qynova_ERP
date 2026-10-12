import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('company_settings');
  if (!hasTable) {
    await knex.schema.createTable('company_settings', (table) => {
      table.integer('id').unsigned().primary();
      table.string('company_name', 255).notNullable().defaultTo('Qynova');
      table.string('legal_name', 255).nullable();
      table.string('tagline', 255).nullable();
      table.string('logo_path', 500).nullable();
      table.string('favicon_path', 500).nullable();
      table.string('address_line1', 255).nullable();
      table.string('address_line2', 255).nullable();
      table.string('city', 100).nullable();
      table.string('state', 100).nullable();
      table.string('pincode', 20).nullable();
      table.string('country', 100).defaultTo('India');
      table.string('phone', 50).nullable();
      table.string('email', 255).nullable();
      table.string('support_email', 255).nullable();
      table.string('website', 255).nullable();
      table.string('gstin', 50).nullable();
      table.string('pan', 50).nullable();
      table.string('cin', 50).nullable();
      table.string('currency', 10).defaultTo('INR');
      table.string('timezone', 50).defaultTo('Asia/Kolkata');
      table.string('date_format', 20).defaultTo('DD/MM/YYYY');
      table.integer('financial_year_start_month').defaultTo(4);
      table.string('signatory_name', 255).nullable();
      table.string('signatory_designation', 255).nullable();
      table.string('signature_image_path', 500).nullable();
      table.text('payslip_footer_text').nullable();
      table.text('email_footer_text').nullable();
      table.decimal('free_leave_per_month', 4, 1).defaultTo(1.0);
      table.decimal('pf_percent', 5, 2).defaultTo(12.0);
      table.decimal('overtime_multiplier', 4, 2).defaultTo(1.5);
      table
        .bigInteger('updated_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed initial singleton row
    await knex('company_settings').insert({
      id: 1,
      company_name: 'Qynova',
      legal_name: 'Qynova Technologies Pvt. Ltd.',
      tagline: 'Run your people, time and payroll in one place.',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      date_format: 'DD/MM/YYYY',
      financial_year_start_month: 4,
      support_email: 'support@qynova.erp',
      email: 'contact@qynova.erp',
      phone: '+91 80 4123 4567',
      website: 'https://qynova.erp',
      address_line1: 'Tech Park, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
      signatory_name: 'Authorized Signatory',
      signatory_designation: 'Head of People Operations',
      payslip_footer_text:
        'This is a computer-generated payslip and does not require a physical signature.',
      email_footer_text:
        'Confidential: This message and any attachments are intended solely for the addressee.',
      free_leave_per_month: 1.0,
      pf_percent: 12.0,
      overtime_multiplier: 1.5,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('company_settings');
}
