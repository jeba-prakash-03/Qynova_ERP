import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing finance data
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex('payments').del();
  await knex('invoice_items').del();
  await knex('invoices').del();
  await knex('expenses').del();
  await knex('expense_categories').del();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  // 1. Seed Expense Categories
  const categories = [
    { name: 'Office Rent', description: 'Monthly workspace rent and facility maintenance' },
    { name: 'Electricity', description: 'Utility and power bills' },
    { name: 'Internet', description: 'Broadband, fiber lease lines, and network infrastructure' },
    { name: 'Software', description: 'SaaS tools, IDE licenses, and development suites' },
    { name: 'Cloud', description: 'AWS, GCP, Azure infrastructure and container hosting' },
    { name: 'Salaries', description: 'Payroll and direct contractor compensation' },
    { name: 'Travel', description: 'Client on-site travel, flights, and accommodation' },
    { name: 'Hardware', description: 'Workstations, test devices, and server hardware' },
    { name: 'Marketing', description: 'Sponsorships, conference booths, and recruitment advertising' },
    { name: 'Other', description: 'Miscellaneous operational expenses' },
  ];

  await knex('expense_categories').insert(categories);
  const catRows = await knex('expense_categories').select('id', 'name');
  const catMap: Record<string, number> = {};
  catRows.forEach((c) => {
    catMap[c.name] = Number(c.id);
  });

  // Get project, client, employee IDs
  const proj1 = await knex('projects').where({ project_code: 'PRJ-0001' }).first();
  const proj2 = await knex('projects').where({ project_code: 'PRJ-0002' }).first();
  const client1 = await knex('clients').where({ client_code: 'CL-0001' }).first();
  const m1 = proj1 ? await knex('project_milestones').where({ project_id: proj1.id }).first() : null;

  const adminUser = await knex('users').where({ email: 'admin@qynova.erp' }).first();
  const managerEmp = await knex('employees').where({ email: 'manager@qynova.erp' }).first();
  const devEmp = await knex('employees').where({ email: 'employee@qynova.erp' }).first();

  const adminUserId = adminUser?.id || 1;
  const managerId = managerEmp?.id || 1;
  const devId = devEmp?.id || 2;

  // 2. Seed Expenses
  if (proj1 && client1) {
    await knex('expenses').insert([
      {
        expense_code: 'EXP-1001',
        category_id: catMap['Cloud'],
        category: 'Cloud',
        project_id: proj1.id,
        employee_id: devId,
        amount: 24500.0,
        date: '2026-10-02',
        vendor: 'Amazon Web Services India',
        description: 'AWS ECS & RDS staging cluster for Core Banking Modernization',
        status: 'approved',
        approved_by: managerId,
        approved_at: '2026-10-03 11:30:00',
        created_by: adminUserId,
      },
      {
        expense_code: 'EXP-1002',
        category_id: catMap['Software'],
        category: 'Software',
        project_id: proj1.id,
        employee_id: devId,
        amount: 8500.0,
        date: '2026-10-05',
        vendor: 'JetBrains s.r.o.',
        description: 'All Products Pack annual license for lead architects',
        status: 'paid',
        approved_by: managerId,
        approved_at: '2026-10-05 14:00:00',
        created_by: adminUserId,
      },
      {
        expense_code: 'EXP-1003',
        category_id: catMap['Travel'],
        category: 'Travel',
        project_id: proj1.id,
        employee_id: managerId,
        amount: 14200.0,
        date: '2026-10-08',
        vendor: 'MakeMyTrip / IndiGo',
        description: 'Flight tickets for on-site architecture sign-off at client HQ Mumbai',
        status: 'pending_approval',
        created_by: adminUserId,
      },
      {
        expense_code: 'EXP-1004',
        category_id: catMap['Office Rent'],
        category: 'Office Rent',
        project_id: null,
        employee_id: managerId,
        amount: 150000.0,
        date: '2026-10-01',
        vendor: 'DLF Cybercity Developers',
        description: 'Guindy Tech Park Main Office October Rent',
        status: 'paid',
        approved_by: managerId,
        approved_at: '2026-10-01 10:00:00',
        created_by: adminUserId,
      },
    ]);

    // 3. Seed Invoices
    const [inv1Id] = await knex('invoices').insert({
      invoice_number: 'INV-2026-0001',
      client_id: client1.id,
      project_id: proj1.id,
      milestone_id: m1?.id || null,
      issue_date: '2026-10-05',
      due_date: '2026-10-25',
      subtotal: 500000.0,
      tax_percent: 18.0,
      tax_amount: 90000.0,
      total: 590000.0,
      amount_paid: 590000.0,
      status: 'paid',
      notes: 'Milestone 1 architecture sign-off delivered and approved.',
      terms: 'Payment due within 20 calendar days from issue date.',
      created_by: adminUserId,
    });

    await knex('invoice_items').insert([
      {
        invoice_id: inv1Id,
        description: 'Milestone 1: Architecture Blueprint & ISO20022 Schema Design',
        quantity: 1.0,
        unit_price: 500000.0,
        amount: 500000.0,
      },
    ]);

    // Payment for INV-2026-0001
    await knex('payments').insert([
      {
        payment_number: 'PAY-2026-0001',
        invoice_id: inv1Id,
        amount: 590000.0,
        payment_date: '2026-10-10',
        method: 'bank_transfer',
        reference: 'HDFC-NEFT-9988221144',
        notes: 'Full payment cleared for Milestone 1',
        recorded_by: adminUserId,
      },
    ]);

    // Seed Second Invoice (Partially Paid / Sent)
    if (proj2) {
      const client2 = await knex('clients').where({ client_code: 'CL-0002' }).first();
      if (client2) {
        const [inv2Id] = await knex('invoices').insert({
          invoice_number: 'INV-2026-0002',
          client_id: client2.id,
          project_id: proj2.id,
          milestone_id: null,
          issue_date: '2026-10-08',
          due_date: '2026-10-30',
          subtotal: 300000.0,
          tax_percent: 18.0,
          tax_amount: 54000.0,
          total: 354000.0,
          amount_paid: 100000.0,
          status: 'partially_paid',
          notes: 'Sprint 1 Advance Retainer for Telemedicine WebRTC',
          terms: 'Standard Net 30 terms.',
          created_by: adminUserId,
        });

        await knex('invoice_items').insert([
          {
            invoice_id: inv2Id,
            description: 'Telemedicine Platform - Initial Sprint Retainer',
            quantity: 1.0,
            unit_price: 300000.0,
            amount: 300000.0,
          },
        ]);

        await knex('payments').insert([
          {
            payment_number: 'PAY-2026-0002',
            invoice_id: inv2Id,
            amount: 100000.0,
            payment_date: '2026-10-11',
            method: 'bank_transfer',
            reference: 'ICICI-RTGS-5544332211',
            notes: 'Advance installment received',
            recorded_by: adminUserId,
          },
        ]);
      }
    }
  }
}
