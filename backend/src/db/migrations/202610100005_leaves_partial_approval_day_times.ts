import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add approved_days and rejected_days columns to leave_requests
  await knex.schema.alterTable('leave_requests', (table) => {
    table.decimal('approved_days', 4, 1).notNullable().defaultTo(0.0);
    table.decimal('rejected_days', 4, 1).notNullable().defaultTo(0.0);
  });

  // 2. Create leave_request_days table
  await knex.schema.createTable('leave_request_days', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('leave_request_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('leave_requests')
      .onDelete('CASCADE');
    table.date('date').notNullable();
    table.string('day_type', 20).notNullable().defaultTo('full'); // full, first_half, second_half
    table.string('from_time', 10).nullable(); // HH:mm format
    table.string('to_time', 10).nullable();   // HH:mm format
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, approved, rejected, cancelled
    table.text('decision_note').nullable();
    table.bigInteger('decided_by').unsigned().nullable();
    table.timestamp('decided_at').nullable();

    table.unique(['leave_request_id', 'date']);
  });

  // 3. Migrate existing leave_requests into leave_request_days
  const existingRequests = await knex('leave_requests').select('*');
  for (const req of existingRequests) {
    let approvedDays = 0.0;
    let rejectedDays = 0.0;
    if (req.status === 'approved') {
      approvedDays = Number(req.days);
    } else if (req.status === 'rejected') {
      rejectedDays = Number(req.days);
    }

    await knex('leave_requests')
      .where({ id: req.id })
      .update({
        approved_days: approvedDays,
        rejected_days: rejectedDays,
      });

    // Populate day row for single date or simple range
    const fromDate = new Date(req.from_date);
    const toDate = new Date(req.to_date);

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayType = req.is_half_day
        ? req.half_day_session === 'second'
          ? 'second_half'
          : 'first_half'
        : 'full';

      await knex('leave_request_days')
        .insert({
          leave_request_id: req.id,
          date: dateStr,
          day_type: dayType,
          from_time: req.from_time || null,
          to_time: req.to_time || null,
          status: req.status === 'partially_approved' ? 'approved' : req.status,
          decision_note: req.decision_note || null,
          decided_by: req.approver_employee_id || null,
          decided_at: req.decided_at || null,
        })
        .onConflict(['leave_request_id', 'date'])
        .ignore();
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_request_days');
  await knex.schema.alterTable('leave_requests', (table) => {
    table.dropColumn('approved_days');
    table.dropColumn('rejected_days');
  });
}
