import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const currentYear = new Date().getFullYear();

  // 1. Seed standard leave types
  const leaveTypesData = [
    {
      name: 'Casual Leave',
      code: 'CL',
      yearly_quota: 12.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Sick Leave',
      code: 'SL',
      yearly_quota: 12.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Earned Leave',
      code: 'EL',
      yearly_quota: 15.0,
      is_paid: true,
      carry_forward: true,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Loss of Pay',
      code: 'LOP',
      yearly_quota: 0.0,
      is_paid: false,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Permission',
      code: 'PERM',
      yearly_quota: 24.0, // 2 per month
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Work From Home',
      code: 'WFH',
      yearly_quota: 30.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
    {
      name: 'Comp Off',
      code: 'COMP_OFF',
      yearly_quota: 0.0,
      is_paid: true,
      carry_forward: false,
      requires_approval: true,
      allow_half_day: true,
    },
  ];

  for (const lt of leaveTypesData) {
    const existing = await knex('leave_types').where({ code: lt.code }).first();
    if (!existing) {
      await knex('leave_types').insert(lt);
    } else {
      await knex('leave_types').where({ code: lt.code }).update(lt);
    }
  }

  const allLeaveTypes = await knex('leave_types').select('*');
  const typeMap: Record<string, any> = {};
  allLeaveTypes.forEach((t) => {
    typeMap[t.code] = t;
  });

  // 2. Allocate default yearly quotas for active employees
  const employees = await knex('employees').whereNull('deleted_at').select('id', 'employee_code', 'reporting_manager_id');
  if (employees.length === 0) return;

  for (const emp of employees) {
    for (const lt of allLeaveTypes) {
      const existingBal = await knex('leave_balances')
        .where({
          employee_id: emp.id,
          leave_type_id: lt.id,
          year: currentYear,
        })
        .first();

      if (!existingBal) {
        await knex('leave_balances').insert({
          employee_id: emp.id,
          leave_type_id: lt.id,
          year: currentYear,
          allocated: Number(lt.yearly_quota),
          used: 0.0,
          pending: 0.0,
        });
      }
    }
  }

  // 3. Seed realistic sample leave requests if none exist
  const existingReqs = await knex('leave_requests').first();
  if (!existingReqs && employees.length >= 2) {
    const emp1 = employees[0];
    const emp2 = employees[1];
    const clType = typeMap['CL'];
    const slType = typeMap['SL'];
    const wfhType = typeMap['WFH'];

    if (clType && emp1) {
      // Pending request from emp1
      await knex('leave_requests').insert({
        employee_id: emp1.id,
        leave_type_id: clType.id,
        from_date: `${currentYear}-10-26`,
        to_date: `${currentYear}-10-27`,
        is_half_day: false,
        days: 2.0,
        reason: 'Family function in hometown',
        status: 'pending',
      });
      await knex('leave_balances')
        .where({ employee_id: emp1.id, leave_type_id: clType.id, year: currentYear })
        .increment('pending', 2.0);
    }

    if (slType && emp2) {
      // Approved request for emp2
      const approverId = emp2.reporting_manager_id || emp1.id;
      await knex('leave_requests').insert({
        employee_id: emp2.id,
        leave_type_id: slType.id,
        from_date: `${currentYear}-10-12`,
        to_date: `${currentYear}-10-12`,
        is_half_day: false,
        days: 1.0,
        reason: 'Viral fever rest',
        status: 'approved',
        approver_employee_id: approverId,
        decided_at: knex.fn.now(),
        decision_note: 'Approved. Get well soon.',
      });
      await knex('leave_balances')
        .where({ employee_id: emp2.id, leave_type_id: slType.id, year: currentYear })
        .increment('used', 1.0);
    }
  }
}
