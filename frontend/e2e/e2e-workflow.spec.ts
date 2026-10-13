import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';

// Shared state between sequential test steps
let adminPassword = 'SuperAdmin#Qynova2026!';
const adminNewPassword = 'SuperAdmin#QynovaNew2026!';
let managerTempPassword = '';
const managerNewPassword = 'MarcusManager#2026!';
let employeeTempPassword = '';
const employeeNewPassword = 'JohnDeveloper#2026!';
let employeeId = '';

// Helper for deterministic login
async function loginUser(page: Page, email: string, pass: string) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  await page.fill('#work-email', email.trim());
  await page.fill('#current-password', pass.trim());
  await page.click('button[type="submit"]');
  // Wait for login redirection away from /login
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
}

// Helper to reliably select option by partial text
async function selectOptionByText(selectLocator: any, text: string) {
  const option = selectLocator.locator(`option:has-text("${text}")`).first();
  const val = await option.getAttribute('value');
  if (val !== null && val !== undefined) {
    await selectLocator.selectOption(val);
  }
}

test.describe.serial('Qynova ERP End-to-End Enterprise Workflow Suite', () => {
  // Step A: Database Reset & Essential Seed without dropping schema
  test.beforeAll(async () => {
    adminPassword = 'SuperAdmin#Qynova2026!';
    console.log('[E2E SETUP] Resetting data tables in qynova_e2e and applying essential seed...');
    try {
      const dbUser = process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASSWORD ? `-p"${process.env.DB_PASSWORD}"` : '';
      const dbHost = process.env.DB_HOST ? `-h ${process.env.DB_HOST}` : '';
      const dbPort = process.env.DB_PORT ? `-P ${process.env.DB_PORT}` : '';
      execSync(
        `mysql -u ${dbUser} ${dbPass} ${dbHost} ${dbPort} -e "SET FOREIGN_KEY_CHECKS = 0; TRUNCATE qynova_e2e.users; TRUNCATE qynova_e2e.user_roles; TRUNCATE qynova_e2e.employees; TRUNCATE qynova_e2e.employee_bank_details; TRUNCATE qynova_e2e.employee_emergency_contacts; TRUNCATE qynova_e2e.employee_lifecycle_history; TRUNCATE qynova_e2e.employee_documents; TRUNCATE qynova_e2e.departments; TRUNCATE qynova_e2e.designations; TRUNCATE qynova_e2e.leave_balances; TRUNCATE qynova_e2e.leave_requests; TRUNCATE qynova_e2e.leave_request_days; TRUNCATE qynova_e2e.attendance; TRUNCATE qynova_e2e.attendance_breaks; TRUNCATE qynova_e2e.timesheets; TRUNCATE qynova_e2e.offer_letters; TRUNCATE qynova_e2e.salary_structures; TRUNCATE qynova_e2e.payroll_runs; TRUNCATE qynova_e2e.payroll_items; TRUNCATE qynova_e2e.payroll_adjustments; SET FOREIGN_KEY_CHECKS = 1;" && npx cross-env DB_NAME=qynova_e2e ADMIN_EMAIL=admin@qynova.erp ADMIN_PASSWORD="SuperAdmin#Qynova2026!" npx knex --knexfile src/db/knexfile.ts seed:run`,
        { cwd: '../backend', stdio: 'inherit' }
      );
      console.log('[E2E SETUP] Database reset and essential seed complete.');
    } catch (err) {
      console.error('[E2E SETUP ERROR] Database reset failed:', err);
      throw err;
    }
  });

  // Step B: Initial login as Admin with temporary password; force password change; verify redirect
  test('Step B: Admin initial login forces password change and lands on /admin', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    await page.fill('#work-email', 'admin@qynova.erp');
    await page.fill('#current-password', adminPassword);
    await page.click('button[type="submit"]');

    // System must enforce redirect to /change-password
    await page.waitForURL('**/change-password');
    await expect(page.getByRole('heading', { name: /Set new password/i })).toBeVisible();

    // Fill current and new compliant password
    await page.fill('#current-password', adminPassword);
    await page.fill('#new-password', adminNewPassword);
    await page.fill('#confirm-password', adminNewPassword);

    await page.click('button[type="submit"]');

    // Should redirect to /admin dashboard
    await page.waitForURL('**/admin');
    await expect(page.locator('h1')).toContainText(/Organization Overview|Executive Overview/i);
    adminPassword = adminNewPassword;
  });

  // Step C: Configure Company Settings & Branding
  test('Step C: Configure company branding and organizational settings', async ({ page }) => {
    await loginUser(page, 'admin@qynova.erp', adminPassword);
    await page.waitForURL('**/admin');

    // Navigate to System Settings
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText(/System Settings & Policies/i);
    await expect(page.getByText(/Loading company settings/i)).not.toBeVisible();

    // Update Company Profile
    const brandNameInput = page.locator('input[placeholder="e.g. Acme Corporation"]');
    await brandNameInput.click();
    await brandNameInput.fill('Qynova Technologies Global');

    const legalNameInput = page.locator('input[placeholder="e.g. Acme Technologies India Pvt. Ltd."]');
    await legalNameInput.click();
    await legalNameInput.fill('Qynova Technologies Global Pvt. Ltd.');

    const taglineInput = page.locator('input[placeholder*="Modern people"]');
    await taglineInput.click();
    await taglineInput.fill('Engineering Enterprise Excellence');

    // Save Settings
    const saveCompanyBtn = page.getByRole('button', { name: /Save Company Settings/i });
    await expect(saveCompanyBtn).toBeEnabled();
    await saveCompanyBtn.click();

    // Verify success toast notification
    await expect(page.getByText(/Company (details saved|settings updated) successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Switch to Work & Attendance Tab
    const workTabBtn = page.getByRole('button', { name: /Work & Attendance/i });
    await workTabBtn.click();
    await expect(page.getByText(/Shift Timings & Grace Window|Shift Schedules & Business Hours/i)).toBeVisible();

    const saveWorkBtn = page.getByRole('button', { name: /Save Work Settings/i });
    await expect(saveWorkBtn).toBeVisible();
  });

  // Step D: Create Department ("Engineering") and Designation ("Senior Software Engineer")
  test('Step D: Create Department and Designation', async ({ page }) => {
    await loginUser(page, 'admin@qynova.erp', adminPassword);
    await page.waitForURL('**/admin');

    // Create Department
    await page.goto('/departments');
    await page.click('button:has-text("Add Department"), button:has-text("Add your first department")');

    await page.fill('input[placeholder="e.g. Quality Assurance"]', 'Engineering');
    await page.fill('input[placeholder="DEV-QA"]', 'ENG');
    await page.fill('textarea[placeholder="Department purpose and scope"]', 'Core Product Engineering & DevOps');
    await page.click('button:has-text("Save Department")');

    await expect(page.getByText(/Department created successfully/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Engineering').first()).toBeVisible();

    // Create Designation
    await page.goto('/designations');
    await page.click('button:has-text("Add Designation"), button:has-text("Add your first designation")');

    await page.fill('input[placeholder="e.g. Senior Software Engineer"]', 'Senior Software Engineer');
    await page.fill('input[placeholder="SSE"]', 'SSE');
    await page.click('button:has-text("Save Designation")');

    await expect(page.getByText(/Designation created successfully/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Senior Software Engineer').first()).toBeVisible();
  });

  // Step E: Onboard Manager employee (Manager role) and capture credentials
  test('Step E: Onboard Manager employee with Manager role and capture credentials', async ({ page }) => {
    await loginUser(page, 'admin@qynova.erp', adminPassword);
    await page.waitForURL('**/admin');

    await page.goto('/employees/new');
    await expect(page.locator('h1')).toContainText(/Onboard New Employee/i);

    // Account credentials
    await page.fill('input[placeholder="alex.smith@company.com"]', 'marcus.manager@qynova.erp');
    
    // Select Manager Role
    const roleSelect = page.locator('select').filter({ hasText: /security role/i });
    await selectOptionByText(roleSelect, 'Manager');

    // Personal particulars
    await page.fill('input[placeholder="John"]', 'Marcus');
    await page.fill('input[placeholder="Doe"]', 'Vance');
    await page.fill('input[placeholder="+91 9876543210"]', '+91 9876543210');

    // Department & Designation
    const deptSelect = page.locator('select').filter({ hasText: /Select department/i });
    await selectOptionByText(deptSelect, 'Engineering');

    const desigSelect = page.locator('select').filter({ hasText: /Select designation/i });
    await selectOptionByText(desigSelect, 'Senior Software Engineer');

    // Submit Onboarding
    await page.click('button:has-text("Complete Onboarding")');

    // Capture temporary password modal
    await expect(page.getByText(/Employee Onboarded Successfully/i)).toBeVisible({ timeout: 15000 });
    const tempPassEl = page.locator('span.font-mono.font-bold.text-indigo-700');
    managerTempPassword = (await tempPassEl.textContent())?.trim() || '';
    console.log(`[E2E] Generated Manager Temp Password: ${managerTempPassword}`);
    expect(managerTempPassword.length).toBeGreaterThan(6);

    // Close modal
    await page.click('button:has-text("Go to Employee Directory")');
    await page.waitForURL('**/employees');
    await expect(page.getByText('Marcus Vance')).toBeVisible();
  });

  // Step F: Onboard Regular employee reporting to Marcus Vance with offer letter flag
  test('Step F: Onboard Regular employee and initiate Offer Letter generation', async ({ page }) => {
    await loginUser(page, 'admin@qynova.erp', adminPassword);
    await page.waitForURL('**/admin');

    await page.goto('/employees/new');

    await page.fill('input[placeholder="alex.smith@company.com"]', 'john.developer@qynova.erp');

    // Role: Employee
    const roleSelect = page.locator('select').filter({ hasText: /security role/i });
    await selectOptionByText(roleSelect, 'Employee');

    // Names
    await page.fill('input[placeholder="John"]', 'John');
    await page.fill('input[placeholder="Doe"]', 'Developer');
    await page.fill('input[placeholder="+91 9876543210"]', '+91 9123456789');

    // Department & Designation
    const deptSelect = page.locator('select').filter({ hasText: /Select department/i });
    await selectOptionByText(deptSelect, 'Engineering');

    const desigSelect = page.locator('select').filter({ hasText: /Select designation/i });
    await selectOptionByText(desigSelect, 'Senior Software Engineer');

    // Reporting Manager: Marcus Vance
    const mgrSelect = page.locator('select').filter({ hasText: /Direct \/ None/i });
    await selectOptionByText(mgrSelect, 'Marcus Vance');

    // Set salary to 60000
    const salaryInput = page.locator('input[placeholder="50000"]');
    await salaryInput.fill('60000');

    // Check Generate Offer Letter checkbox
    await page.check('#generateOfferLetter');

    // Complete Onboarding
    await page.click('button:has-text("Complete Onboarding")');

    // Modal
    await expect(page.getByText(/Employee Onboarded Successfully/i)).toBeVisible({ timeout: 15000 });
    const tempPassEl = page.locator('span.font-mono.font-bold.text-indigo-700');
    employeeTempPassword = (await tempPassEl.textContent())?.trim() || '';
    console.log(`[E2E] Generated Regular Employee Temp Password: ${employeeTempPassword}`);
    expect(employeeTempPassword.length).toBeGreaterThan(6);

    // Click Generate Offer Letter button on modal
    await page.click('button:has-text("Generate Offer Letter")');

    // Redirected to employee detail offer letter tab
    await page.waitForURL(/.*tab=offer-letter.*/);
    const match = page.url().match(/\/employees\/(\d+)/);
    if (match) {
      employeeId = match[1];
    }
    await expect(page.getByText(/Generate Offer Letter/i).first()).toBeVisible();
  });

  // Step G: Generate Offer Letter for Candidate/Employee, send, and accept
  test('Step G: Generate, send, and accept Offer Letter workflow', async ({ page }) => {
    await loginUser(page, 'admin@qynova.erp', adminPassword);
    await page.waitForURL('**/admin');
    await page.goto(`/employees/${employeeId || '2'}?tab=offer-letter&generate=true`);
    await page.waitForLoadState('networkidle');

    // Modal is already open or click Generate Offer Letter
    const generateModalTitle = page.locator('h3:has-text("Generate Offer Letter")');
    if (!(await generateModalTitle.isVisible())) {
      await page.click('button:has-text("Generate Offer Letter")');
      await expect(generateModalTitle).toBeVisible();
    }

    // Fill Monthly Gross and Annual CTC
    const monthlyGrossInput = page.locator('input[placeholder*="100000"]');
    if (await monthlyGrossInput.isVisible()) {
      await monthlyGrossInput.fill('60000');
    }

    const annualCtcInput = page.locator('input[placeholder*="1200000"]');
    if (await annualCtcInput.isVisible()) {
      await annualCtcInput.fill('720000');
    }

    // Generate Official Letter button
    await page.click('button:has-text("Generate Official Letter")');
    await expect(page.getByText(/Offer letter generated successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Status badge should show GENERATED / Generated
    await expect(page.getByText(/Generated/i).first()).toBeVisible();

    // Send to candidate
    await page.click('button:has-text("Send to Candidate")');
    await expect(page.getByText(/Send Offer Letter/i).first()).toBeVisible();
    await page.click('button:has-text("Dispatch Email"), button:has-text("Confirm & Send Offer")');
    await expect(page.getByText(/Offer letter sent to candidate successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Mark as Accepted
    await page.click('button:has-text("Mark Accepted"), button:has-text("Mark as Accepted")');
    await expect(page.getByText(/Offer marked as accepted/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Accepted/i).first()).toBeVisible();
  });

  // Step H: Employee self-service login, change password, view /me, documents tab, clock in/out
  test('Step H: Employee login, view dashboard /me, inspect documents, clock in/out', async ({ page }) => {
    await loginUser(page, 'john.developer@qynova.erp', employeeTempPassword);

    // Forced password change
    await page.waitForURL('**/change-password');
    await page.fill('#current-password', employeeTempPassword.trim());
    await page.fill('#new-password', employeeNewPassword);
    await page.fill('#confirm-password', employeeNewPassword);
    await page.click('button[type="submit"]');

    // Lands on Employee Profile /me
    await page.waitForURL('**/me');
    await expect(page.locator('h1')).toContainText(/John Developer/i);

    // Check Documents Tab
    await page.click('button:has-text("Documents")');
    await expect(page.getByText(/Official Offer & Appointment Letter/i)).toBeVisible();
    await expect(page.getByText(/ACCEPTED|Accepted/i).first()).toBeVisible();

    // Punch attendance check in & check out
    await page.goto('/attendance/my');
    await expect(page.locator('h1')).toContainText(/My Attendance/i);

    // Punch CHECK IN
    const checkInBtn = page.getByRole('button', { name: /CHECK IN/i });
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await expect(page.getByText(/Punch In Successful|Checked in successfully/i).first()).toBeVisible({ timeout: 10000 });
    }

    // Punch CHECK OUT
    const checkOutBtn = page.getByRole('button', { name: /CHECK OUT/i });
    if (await checkOutBtn.isVisible()) {
      await checkOutBtn.click();
      await expect(page.getByText(/Punch Out Successful|Checked out successfully/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  // Step I: Employee applies for leave (2 days Casual Leave)
  test('Step I: Employee applies for leave', async ({ page }) => {
    await loginUser(page, 'john.developer@qynova.erp', employeeNewPassword);
    await page.waitForURL('**/me');

    await page.goto('/leaves/my');
    await expect(page.locator('h1')).toContainText(/My Leaves/i);

    await page.click('button:has-text("Apply for Leave"), button:has-text("Apply Leave")');
    await expect(page.getByText(/Apply for Leave \/ Time Off/i)).toBeVisible();

    // Select Leave Type (Casual Leave or Privilege Leave)
    const leaveTypeSelect = page.locator('select').filter({ hasText: /Casual Leave/i });
    await selectOptionByText(leaveTypeSelect, 'Casual Leave');

    // Set 2 weekdays in current month (e.g. 2026-10-19 to 2026-10-20)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const fromDate = `${year}-${month}-19`;
    const toDate = `${year}-${month}-20`;

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(fromDate);
    await dateInputs.nth(1).fill(toDate);
    await page.waitForTimeout(600);

    const reasonInput = page.locator('textarea');
    await reasonInput.fill('Attending family wedding ceremony out of town.');

    await page.click('button:has-text("Submit Application"), button:has-text("Submit Leave Request")');
    await expect(page.getByText(/Leave (application|request) submitted successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Verify row in table with pending status
    await expect(page.getByText('Attending family wedding ceremony out of town.').first()).toBeVisible();
    await expect(page.getByText('PENDING').or(page.getByText('Pending')).first()).toBeVisible();
  });

  // Step J: Manager logs in, verifies /manager portal, sees leave request and approves it
  test('Step J: Manager logs in, views /manager, and approves team leave request', async ({ page }) => {
    await loginUser(page, 'marcus.manager@qynova.erp', managerTempPassword);

    // Manager forced password change
    await page.waitForURL('**/change-password');
    await page.fill('#current-password', managerTempPassword.trim());
    await page.fill('#new-password', managerNewPassword);
    await page.fill('#confirm-password', managerNewPassword);
    await page.click('button[type="submit"]');

    // Redirect to /manager
    await page.waitForURL('**/manager');
    await expect(page.locator('h1')).toContainText(/Welcome, Marcus/i);

    // Pending Approvals widget should show John's request
    await expect(page.getByText(/Pending Approvals/i)).toBeVisible();

    // Navigate to Leave Approvals
    await page.goto('/leaves/approvals');
    await expect(page.locator('h1')).toContainText(/Leave Approvals/i);

    // Look for John Developer in the table
    await expect(page.getByText('John Developer').first()).toBeVisible();

    // Click Review & Approve
    await page.click('button:has-text("Review & Approve")');
    await expect(page.getByText(/Review Leave Request/i)).toBeVisible();

    // Confirm Decision
    await page.click('button:has-text("Confirm Decision")');
    await expect(page.getByText(/Leave (decision saved|request decision processed) successfully/i).first()).toBeVisible({ timeout: 10000 });
  });

  // Step K: Employee submits timesheet
  test('Step K: Employee submits timesheet entry', async ({ page }) => {
    await loginUser(page, 'john.developer@qynova.erp', employeeNewPassword);
    await page.waitForURL('**/me');

    await page.goto('/timesheets/my');
    await expect(page.locator('h1')).toContainText(/My Timesheets/i);

    // Fill Timesheet Entry
    const hoursInput = page.locator('input[type="number"]');
    await hoursInput.fill('8');

    const descInput = page.locator('textarea[placeholder*="Describe work completed"]');
    await descInput.fill('Implemented core authentication services and fixed Playwright suite.');

    await page.click('button[type="submit"]:has-text("Submit Entry"), button[type="submit"]:has-text("Submit Timesheet")');
    await expect(page.getByText(/Timesheet submitted successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Entry should appear in table
    await expect(page.getByText('Implemented core authentication services and fixed Playwright suite.').first()).toBeVisible();
    await expect(page.getByText('PENDING').first()).toBeVisible();
  });

  // Step L: Manager reviews and approves timesheet
  test('Step L: Manager reviews and approves timesheet', async ({ page }) => {
    await loginUser(page, 'marcus.manager@qynova.erp', managerNewPassword);
    await page.waitForURL('**/manager');

    await page.goto('/timesheets/approvals');
    await expect(page.locator('h1')).toContainText(/Timesheet Approvals/i);

    // Pending timesheet for John Developer
    await expect(page.getByText('John Developer').first()).toBeVisible();
    await expect(page.getByText(/8(\.00)? hrs/).first()).toBeVisible();

    // Approve Timesheet
    await page.click('button:has-text("Approve")');
    await expect(page.getByText(/Timesheet (entry )?approved successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Table now empty
    await expect(page.getByText(/No Pending Timesheets/i)).toBeVisible();
  });

  // Step M: Log in as HR/Admin: run payroll for the current month; verify 1 free leave deduction and daily rate calculation
  test('Step M: Admin runs payroll and verifies free leave & LOP calculations', async ({ page }) => {
    await loginUser(page, 'admin@qynova.erp', adminPassword);
    await page.waitForURL('**/admin');

    await page.goto('/payroll/runs');
    await expect(page.locator('h1')).toContainText(/Payroll Processing|Monthly Payroll Management/i);

    // Click Calculate / Recalculate Payroll
    const calcBtn = page.getByRole('button', { name: /Run Payroll|Recalculate Run|Calculate Payroll/i });
    await calcBtn.click();

    await expect(page.getByText(/calculated successfully/i).first()).toBeVisible({ timeout: 15000 });

    // Verification of Payroll Summary and John Developer calculation
    const johnRow = page.locator('tr').filter({ hasText: 'John Developer' });
    await expect(johnRow).toBeVisible();
    await expect(johnRow.getByText(/₹[0-9,.]+/).first()).toBeVisible();
  });

  // Step N: RBAC & Permission Enforcement
  test('Step N: Employee restricted from /admin and /roles; unauthorized actions rejected', async ({ page }) => {
    await loginUser(page, 'john.developer@qynova.erp', employeeNewPassword);
    await page.waitForURL('**/me');

    // 1. Employee attempting to access /admin sees 403 Access Restricted block
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Access Restricted \(403\)/i })).toBeVisible();
    await expect(page.getByText(/You do not have permission to access this dashboard module/i)).toBeVisible();

    // 2. Employee attempting to access /roles sees permission restricted block
    await page.goto('/roles');
    await expect(page.getByRole('heading', { name: /Access Restricted/i })).toBeVisible();

    // 3. API-level enforcement test: call POST /api/v1/roles with employee token
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const response = await page.request.post('http://localhost:5000/api/v1/roles', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: 'HackerRole',
        description: 'Unauthorized role attempt',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Permission');
  });
});
