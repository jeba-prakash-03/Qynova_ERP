import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 1. Seed or update work settings
  const existingSettings = await knex('work_settings').first();
  if (!existingSettings) {
    await knex('work_settings').insert({
      weekly_off_days: JSON.stringify([0, 6]),
      shift_start: '09:30',
      shift_end: '18:30',
      late_grace_minutes: 10,
      min_hours_full_day: 8.0,
      min_hours_half_day: 4.0,
    });
  }

  // 2. Seed holidays for 2026
  const holidaysData = [
    { date: '2026-01-26', name: 'Republic Day', type: 'public' },
    { date: '2026-03-25', name: 'Holi', type: 'public' },
    { date: '2026-04-14', name: 'Tamil New Year', type: 'public' },
    { date: '2026-05-01', name: 'May Day', type: 'public' },
    { date: '2026-07-15', name: 'Qynova Foundation Day', type: 'company' },
    { date: '2026-08-15', name: 'Independence Day', type: 'public' },
    { date: '2026-09-18', name: 'Annual Tech Day', type: 'company' },
    { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'public' },
    { date: '2026-11-08', name: 'Diwali', type: 'public' },
    { date: '2026-12-25', name: 'Christmas Day', type: 'public' },
  ];

  for (const h of holidaysData) {
    const exists = await knex('holidays').where({ date: h.date }).first();
    if (!exists) {
      await knex('holidays').insert(h);
    }
  }

  // 3. Seed 30 days of attendance for existing employees
  const employees = await knex('employees').whereNull('deleted_at').select('id', 'employee_code');
  if (employees.length === 0) return;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const holidays = await knex('holidays').select('date');
  const holidaySet = new Set(holidays.map((h) => {
    return h.date instanceof Date ? h.date.toISOString().split('T')[0] : h.date;
  }));

  const today = new Date();

  // Clear existing seeded attendance to ensure clean idempotent seed
  await knex('attendance_breaks').truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex('attendance').truncate();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  for (let i = 30; i >= 1; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);

    const year = targetDate.getFullYear();
    const month = pad(targetDate.getMonth() + 1);
    const day = pad(targetDate.getDate());
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(dateStr);

    for (const emp of employees) {
      const empId = Number(emp.id);

      if (isHoliday) {
        await knex('attendance').insert({
          employee_id: empId,
          date: dateStr,
          status: 'holiday',
          work_type: 'office',
          working_minutes: 0,
          break_minutes: 0,
          overtime_minutes: 0,
          is_late: false,
          is_early_checkout: false,
        });
      } else if (isWeekend) {
        await knex('attendance').insert({
          employee_id: empId,
          date: dateStr,
          status: 'weekend',
          work_type: 'office',
          working_minutes: 0,
          break_minutes: 0,
          overtime_minutes: 0,
          is_late: false,
          is_early_checkout: false,
        });
      } else {
        // Working Day simulation:
        // Most employees present, occasional leave or half-day
        const pseudoRand = (empId * 13 + i * 7) % 100;

        if (pseudoRand < 5) {
          // Leave
          await knex('attendance').insert({
            employee_id: empId,
            date: dateStr,
            status: 'leave',
            work_type: 'office',
            working_minutes: 0,
            break_minutes: 0,
            overtime_minutes: 0,
            is_late: false,
            is_early_checkout: false,
            remarks: 'Planned personal leave',
          });
        } else if (pseudoRand < 10) {
          // Half day
          const checkIn = new Date(`${dateStr}T09:30:00Z`);
          const checkOut = new Date(`${dateStr}T14:00:00Z`);
          const workingMins = 270; // 4.5 hrs
          await knex('attendance').insert({
            employee_id: empId,
            date: dateStr,
            check_in: checkIn,
            check_out: checkOut,
            status: 'half_day',
            work_type: 'office',
            working_minutes: workingMins,
            break_minutes: 0,
            overtime_minutes: 0,
            is_late: false,
            is_early_checkout: true,
            remarks: 'Half-day doctor appointment',
          });
        } else {
          // Present or WFH
          const isWfh = pseudoRand > 75;
          const isLate = pseudoRand % 7 === 0; // occasional late
          const hasOvertime = pseudoRand % 4 === 0;

          const inMinute = isLate ? 48 : 20; // 09:48 (late) or 09:20 (on time)
          const outMinute = hasOvertime ? 30 : 30;
          const outHour = hasOvertime ? 19 : 18; // 19:30 (overtime) or 18:30

          const checkIn = new Date(`${dateStr}T09:${pad(inMinute)}:00Z`);
          const checkOut = new Date(`${dateStr}T${pad(outHour)}:${pad(outMinute)}:00Z`);

          const breakMins = 45;
          const grossMinutes = (outHour * 60 + outMinute) - (9 * 60 + inMinute);
          const workingMins = grossMinutes - breakMins;
          const overtimeMins = hasOvertime ? 60 : 0;

          const [attId] = await knex('attendance').insert({
            employee_id: empId,
            date: dateStr,
            check_in: checkIn,
            check_out: checkOut,
            status: isWfh ? 'wfh' : 'present',
            work_type: isWfh ? 'wfh' : 'office',
            working_minutes: workingMins,
            break_minutes: breakMins,
            overtime_minutes: overtimeMins,
            is_late: isLate,
            is_early_checkout: false,
          });

          // Insert lunch break
          await knex('attendance_breaks').insert({
            attendance_id: attId,
            break_start: new Date(`${dateStr}T13:00:00Z`),
            break_end: new Date(`${dateStr}T13:45:00Z`),
          });
        }
      }
    }
  }
}
