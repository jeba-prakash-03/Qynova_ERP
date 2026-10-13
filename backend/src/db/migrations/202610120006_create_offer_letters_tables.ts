import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create offer_letter_templates table
  if (!(await knex.schema.hasTable('offer_letter_templates'))) {
    await knex.schema.createTable('offer_letter_templates', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('name', 255).notNullable();
      table.string('subject', 255).notNullable();
      table.text('body_html', 'longtext').notNullable();
      table.boolean('is_default').defaultTo(false).notNullable();
      table
        .bigInteger('created_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }

  // 2. Create offer_letters table
  if (!(await knex.schema.hasTable('offer_letters'))) {
    await knex.schema.createTable('offer_letters', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('reference_no', 100).notNullable().unique();
      table
        .bigInteger('employee_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .onDelete('CASCADE');
      table
        .bigInteger('template_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('offer_letter_templates')
        .onDelete('SET NULL');
      table.integer('version').defaultTo(1).notNullable();
      table
        .enum('status', [
          'draft',
          'generated',
          'sent',
          'accepted',
          'declined',
          'expired',
          'superseded',
        ])
        .defaultTo('draft')
        .notNullable();
      table.date('joining_date').notNullable();
      table.string('designation', 150).notNullable();
      table.string('department', 150).nullable();
      table.string('employment_type', 50).notNullable().defaultTo('full_time');
      table.decimal('monthly_gross', 12, 2).notNullable().defaultTo(0);
      table.decimal('annual_ctc', 12, 2).notNullable().defaultTo(0);
      table.integer('probation_months').defaultTo(3).notNullable();
      table.string('work_location', 150).notNullable().defaultTo('Headquarters');
      table.string('working_hours', 100).notNullable().defaultTo('9:30 AM - 6:30 PM (Mon-Fri)');
      table.integer('notice_period_days').defaultTo(30).notNullable();
      table.date('offer_valid_until').notNullable();
      table.text('decline_reason').nullable();
      table
        .bigInteger('generated_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('generated_at').nullable();
      table.timestamp('sent_at').nullable();
      table.timestamp('accepted_at').nullable();
      table.string('file_path', 500).nullable();
      table.json('snapshot').nullable();
      table.timestamps(true, true);

      table.index(['employee_id']);
      table.index(['status']);
      table.index(['reference_no']);
    });
  }

  // 3. Seed default professional offer letter template if none exists
  const existingDefault = await knex('offer_letter_templates').where({ is_default: true }).first();
  if (!existingDefault) {
    const defaultTemplateHtml = `<p>Dear <strong>{{employee_name}}</strong>,</p>

<p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{company_name}}</strong>. We were thoroughly impressed by your credentials, expertise, and background, and we are excited about the prospect of you joining our team.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">1. Appointment & Commencement of Employment</h3>
<p>Your employment with {{company_name}} will commence on <strong>{{joining_date}}</strong>. This is a <strong>{{employment_type}}</strong> appointment based at our office in <strong>{{work_location}}</strong>. Your standard working hours will be <strong>{{working_hours}}</strong>, Monday through Friday, subject to company operational requirements.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">2. Reporting & Responsibilities</h3>
<p>In this role, you will report directly to <strong>{{reporting_manager}}</strong>. You will be responsible for the duties and tasks associated with the designation of {{designation}}, along with other assignments delegated to you from time to time.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">3. Compensation & Benefits</h3>
<p>You will receive a Monthly Gross Salary of <strong>{{monthly_gross}}</strong>, corresponding to an Annual Cost to Company (CTC) of <strong>{{annual_ctc}}</strong>. The detailed breakup of your compensation structure is provided below:</p>

{{salary_breakup_table}}

<p>All compensation and allowances are subject to statutory deductions including Income Tax (TDS), Provident Fund (PF), and Professional Tax in accordance with applicable laws.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">4. Probation & Confirmation</h3>
<p>You will be on probation for a period of <strong>{{probation_months}} months</strong> from your date of joining. Upon successful completion of your probation period and satisfactory performance assessment, your employment will be confirmed in writing. During the probation period, either party may terminate the employment with written notice as per company policy.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">5. Notice Period</h3>
<p>Following confirmation, either party may terminate the employment relationship by providing <strong>{{notice_period_days}} days</strong> prior written notice or basic salary in lieu thereof, subject to company approval and handover completion.</p>

<h3 style="color: #1e293b; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">6. Acceptance of Offer</h3>
<p>This offer is valid until <strong>{{offer_valid_until}}</strong>. Please confirm your acceptance by signing this letter and returning a scanned copy, or through our digital acceptance portal.</p>

<p>We look forward to welcoming you aboard and achieving great milestones together!</p>

<p>Sincerely,<br/>
<strong>{{signatory_name}}</strong><br/>
{{signatory_designation}}<br/>
{{company_name}}</p>`;

    await knex('offer_letter_templates').insert({
      name: 'Standard Professional Offer Letter',
      subject: 'Offer of Employment - {{designation}} at {{company_name}}',
      body_html: defaultTemplateHtml,
      is_default: true,
      created_by: null,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('offer_letters');
  await knex.schema.dropTableIfExists('offer_letter_templates');
}
