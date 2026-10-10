import db from '../backend/src/db/knex';

async function run() {
  const isApply = process.argv.includes('--apply');
  console.log(`=== Fix Attendance Before Joining Date (${isApply ? 'APPLY MODE' : 'DRY RUN MODE'}) ===\n`);

  const rows = await db('attendance as a')
    .join('employees as e', 'a.employee_id', 'e.id')
    .whereRaw('a.date < e.joining_date')
    .select(
      'a.id',
      'a.employee_id',
      'e.employee_code',
      'e.first_name',
      'e.last_name',
      'e.joining_date',
      'a.date',
      'a.check_in',
      'a.check_out',
      'a.edited_by',
      'a.status'
    );

  console.log(`Found ${rows.length} attendance row(s) dated before employee joining_date:\n`);

  const deletableIds: number[] = [];
  const realPunchRows: any[] = [];

  for (const r of rows) {
    const jDate = r.joining_date instanceof Date ? r.joining_date.toISOString().split('T')[0] : String(r.joining_date);
    const aDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
    const hasPunch = r.check_in || r.check_out || r.edited_by;

    if (!hasPunch) {
      deletableIds.push(r.id);
      console.log(`  [AUTO-GEN] ID ${r.id} | ${r.employee_code} (${r.first_name} ${r.last_name}) | Att Date: ${aDate} < Joining: ${jDate} | Status: ${r.status}`);
    } else {
      realPunchRows.push(r);
      console.log(`  [REAL PUNCH - KEPT] ID ${r.id} | ${r.employee_code} (${r.first_name} ${r.last_name}) | Att Date: ${aDate} < Joining: ${jDate} | CheckIn: ${r.check_in || 'N/A'}`);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Auto-generated placeholder rows to delete: ${deletableIds.length}`);
  console.log(`  Real punch rows (preserved): ${realPunchRows.length}`);

  if (isApply) {
    if (deletableIds.length > 0) {
      const deletedCount = await db('attendance').whereIn('id', deletableIds).del();
      console.log(`\nSuccessfully deleted ${deletedCount} auto-generated attendance row(s).`);
    } else {
      console.log(`\nNo rows to delete.`);
    }
  } else {
    console.log(`\nDRY RUN completed. Run with --apply to perform deletion.`);
  }

  await db.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
