import db from '../../db/knex';
import { employeesRepository } from './employees.repository';
import { hashPassword, generateTemporaryPassword } from '../../shared/utils/password.util';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';
import { getTodayKolkata } from '../../shared/utils/date.util';
import {
  EmployeeRecord,
  ALLOWED_LIFECYCLE_TRANSITIONS,
  EmployeeLifecycleHistoryRecord,
} from './employees.types';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpdateLifecycleInput,
  EmployeeQueryParams,
} from './employees.schema';

export class EmployeesService {
  public async getEmployees(params: EmployeeQueryParams): Promise<{ data: EmployeeRecord[]; total: number }> {
    return employeesRepository.findAll(params);
  }

  public async getEmployeeById(id: number): Promise<EmployeeRecord> {
    const employee = await employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  public async getEmployeeByUserId(userId: number): Promise<EmployeeRecord> {
    const employee = await employeesRepository.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('No employee profile associated with your user account');
    }
    return employee;
  }

  public async createEmployee(
    input: CreateEmployeeInput,
    performedByUserId?: number,
    ip?: string
  ): Promise<{ employee: EmployeeRecord; temporaryPassword: string }> {
    // 1. Check email uniqueness in users and employees
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await db('users').where({ email: normalizedEmail }).first();
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists', [
        { field: 'email', message: 'Email address already in use' },
      ]);
    }

    // 2. Verify Role
    const role = await db('roles').where({ id: input.role_id }).first();
    if (!role) {
      throw new BadRequestError('Selected role does not exist', [
        { field: 'role_id', message: 'Role does not exist' },
      ]);
    }

    // 3. Verify Department if provided
    if (input.department_id) {
      const dept = await db('departments').where({ id: input.department_id }).whereNull('deleted_at').first();
      if (!dept) {
        throw new BadRequestError('Selected department does not exist', [
          { field: 'department_id', message: 'Department does not exist' },
        ]);
      }
    }

    // 4. Verify Designation if provided
    if (input.designation_id) {
      const desig = await db('designations').where({ id: input.designation_id }).whereNull('deleted_at').first();
      if (!desig) {
        throw new BadRequestError('Selected designation does not exist', [
          { field: 'designation_id', message: 'Designation does not exist' },
        ]);
      }
    }

    // 5. Verify Reporting Manager if provided
    if (input.reporting_manager_id) {
      const mgr = await db('employees').where({ id: input.reporting_manager_id }).whereNull('deleted_at').first();
      if (!mgr) {
        throw new BadRequestError('Selected reporting manager does not exist', [
          { field: 'reporting_manager_id', message: 'Reporting manager does not exist' },
        ]);
      }
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    let createdEmployeeId = 0;

    // Execute in ONE atomic transaction
    await db.transaction(async (trx) => {
      // Step A: Create User
      const [userId] = await trx('users').insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        status: input.status,
        must_change_password: true,
      });

      // Step B: Assign Role in user_roles
      await trx('user_roles').insert({
        user_id: userId,
        role_id: input.role_id,
      });

      // Step C: Generate sequential employee code
      const employeeCode = await employeesRepository.getNextEmployeeCode(trx);

      // Step D: Create Employee record
      const empId = await employeesRepository.createInTransaction(
        trx,
        {
          employee_code: employeeCode,
          user_id: Number(userId),
          first_name: input.first_name.trim(),
          last_name: input.last_name.trim(),
          photo_url: input.photo_url || null,
          email: normalizedEmail,
          phone: input.phone || null,
          date_of_birth: input.date_of_birth || null,
          address: input.address || null,
          department_id: input.department_id || null,
          designation_id: input.designation_id || null,
          reporting_manager_id: input.reporting_manager_id || null,
          joining_date: input.joining_date,
          employment_type: input.employment_type,
          status: input.status,
          lifecycle_stage: input.lifecycle_stage,
          skills: input.skills || null,
          experience_years: input.experience_years || 0,
        },
        input.bank_details || null,
        input.emergency_contacts || null
      );

      if (input.initial_salary && Number(input.initial_salary) > 0) {
        await trx('salary_structures').insert({
          employee_id: empId,
          base_salary: Number(input.initial_salary),
          is_annual: false,
          effective_from: input.joining_date || getTodayKolkata(),
          created_by: performedByUserId || null,
        });
      }

      createdEmployeeId = empId;
    });

    // Fetch created employee with full relations
    const createdEmployee = await this.getEmployeeById(createdEmployeeId);

    // Audit Log
    await auditService.record({
      userId: performedByUserId,
      action: 'employees.create',
      entity: 'employees',
      entityId: createdEmployeeId,
      newValue: {
        id: createdEmployeeId,
        employee_code: createdEmployee.employee_code,
        email: createdEmployee.email,
        name: `${createdEmployee.first_name} ${createdEmployee.last_name}`,
      },
      ip,
    });

    // Send Welcome Notification
    await notificationService.notify({
      eventKey: `employee:${createdEmployeeId}:created`,
      userIds: createdEmployee.user_id,
      type: 'info',
      title: 'Welcome to the Company Portal',
      message: `Your employee profile has been created with code ${createdEmployee.employee_code}. Please update your temporary password upon first login.`,
      link: '/me',
    });

    // TODO [Dev 2 Integration]: When Dev 2 merges payroll module:
    // if (input.initial_salary) {
    //   await salaryStructureService.createInitialSalary({
    //     employeeId: createdEmployeeId,
    //     ctc: input.initial_salary
    //   });
    // }

    return {
      employee: createdEmployee,
      temporaryPassword,
    };
  }

  public async updateEmployee(
    id: number,
    input: UpdateEmployeeInput,
    performedByUserId?: number,
    ip?: string
  ): Promise<EmployeeRecord> {
    const existing = await this.getEmployeeById(id);

    if (input.department_id) {
      const dept = await db('departments').where({ id: input.department_id }).whereNull('deleted_at').first();
      if (!dept) {
        throw new BadRequestError('Department does not exist', [
          { field: 'department_id', message: 'Department does not exist' },
        ]);
      }
    }

    if (input.designation_id) {
      const desig = await db('designations').where({ id: input.designation_id }).whereNull('deleted_at').first();
      if (!desig) {
        throw new BadRequestError('Designation does not exist', [
          { field: 'designation_id', message: 'Designation does not exist' },
        ]);
      }
    }

    if (input.reporting_manager_id) {
      if (input.reporting_manager_id === id) {
        throw new BadRequestError('An employee cannot report to themselves', [
          { field: 'reporting_manager_id', message: 'Self-reporting not allowed' },
        ]);
      }
      const mgr = await db('employees').where({ id: input.reporting_manager_id }).whereNull('deleted_at').first();
      if (!mgr) {
        throw new BadRequestError('Reporting manager does not exist', [
          { field: 'reporting_manager_id', message: 'Reporting manager does not exist' },
        ]);
      }
    }

    await db.transaction(async (trx) => {
      await employeesRepository.updateInTransaction(
        trx,
        id,
        {
          first_name: input.first_name?.trim(),
          last_name: input.last_name?.trim(),
          photo_url: input.photo_url,
          phone: input.phone,
          date_of_birth: input.date_of_birth,
          address: input.address,
          department_id: input.department_id,
          designation_id: input.designation_id,
          reporting_manager_id: input.reporting_manager_id,
          joining_date: input.joining_date,
          employment_type: input.employment_type,
          status: input.status,
          lifecycle_stage: input.lifecycle_stage,
          skills: input.skills,
          experience_years: input.experience_years,
        },
        input.bank_details,
        input.emergency_contacts
      );

      // If role_id provided, update user_roles
      if (input.role_id) {
        await trx('user_roles').where({ user_id: existing.user_id }).del();
        await trx('user_roles').insert({
          user_id: existing.user_id,
          role_id: input.role_id,
        });
      }

      // If status updated, sync user account status
      if (input.status && input.status !== existing.status) {
        await trx('users').where({ id: existing.user_id }).update({ status: input.status });
      }
    });

    const updated = await this.getEmployeeById(id);

    await auditService.record({
      userId: performedByUserId,
      action: 'employees.edit',
      entity: 'employees',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      ip,
    });

    return updated;
  }

  public async updateLifecycleStage(
    id: number,
    input: UpdateLifecycleInput,
    performedByUserId?: number,
    ip?: string
  ): Promise<EmployeeRecord> {
    const existing = await this.getEmployeeById(id);
    const currentStage = existing.lifecycle_stage;
    const nextStage = input.lifecycle_stage;

    // Reject invalid jumps with 400
    const allowed = ALLOWED_LIFECYCLE_TRANSITIONS[currentStage] || [];
    if (!allowed.includes(nextStage)) {
      throw new BadRequestError(
        `Invalid lifecycle transition from '${currentStage}' to '${nextStage}'. Allowed next stage: ${
          allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'
        }`
      );
    }

    const note = (input as any).note || input.notes || null;

    // Execute stage update, history record, and status change in DB transaction
    await db.transaction(async (trx) => {
      // 1. Record history
      await employeesRepository.recordLifecycleTransition(
        id,
        currentStage,
        nextStage,
        performedByUserId || existing.user_id,
        note,
        trx
      );

      // 2. Update employee lifecycle stage
      await employeesRepository.updateLifecycleStage(id, nextStage, trx);

      // 3. On relieved: set employees.status = inactive, last_working_date = today and users.status = disabled
      if (nextStage === 'relieved') {
        const today = new Date().toISOString().split('T')[0];
        await trx('employees').where({ id }).update({ status: 'inactive', last_working_date: today });
        await trx('users').where({ id: existing.user_id }).update({ status: 'disabled' });
      }
    });

    const updated = await this.getEmployeeById(id);

    // Audit log
    await auditService.record({
      userId: performedByUserId,
      action: 'employees.lifecycle_change',
      entity: 'employees',
      entityId: id,
      oldValue: { lifecycle_stage: currentStage },
      newValue: { lifecycle_stage: nextStage, note },
      ip,
    });

    // Notify HR when someone moves to resigned and when a new employee becomes active
    try {
      const hrUsers = await db('users as u')
        .join('user_roles as ur', 'u.id', 'ur.user_id')
        .join('roles as r', 'ur.role_id', 'r.id')
        .whereIn('r.name', ['HR', 'Admin'])
        .select('u.id');
      const hrUserIds = Array.from(new Set(hrUsers.map((u) => Number(u.id))));

      if (nextStage === 'resigned' && hrUserIds.length > 0) {
        await notificationService.notify({
          eventKey: `employee:${id}:lifecycle:resigned`,
          userIds: hrUserIds,
          type: 'warning',
          title: 'Employee Resignation Submitted',
          message: `${existing.first_name} ${existing.last_name} (${existing.employee_code}) has submitted their resignation.`,
          link: `/employees/${id}`,
        });
      } else if (nextStage === 'active' && hrUserIds.length > 0) {
        await notificationService.notify({
          eventKey: `employee:${id}:lifecycle:active`,
          userIds: hrUserIds,
          type: 'success',
          title: 'New Employee Active',
          message: `${existing.first_name} ${existing.last_name} (${existing.employee_code}) is now marked as active in the company.`,
          link: `/employees/${id}`,
        });
      }
    } catch (notifErr) {
      console.error('[LIFECYCLE_NOTIFY_ERROR] Failed to send HR notification:', notifErr);
    }

    // Notify employee of lifecycle update
    await notificationService.notify({
      eventKey: `employee:${id}:lifecycle:${nextStage}`,
      userIds: existing.user_id,
      type: 'info',
      title: 'Lifecycle Stage Updated',
      message: `Your employment lifecycle stage has progressed to '${nextStage}'.`,
      link: '/me',
    });

    return updated;
  }

  public async getLifecycleHistory(id: number): Promise<EmployeeLifecycleHistoryRecord[]> {
    await this.getEmployeeById(id);
    return employeesRepository.getLifecycleHistory(id);
  }

  public async deleteEmployee(id: number, performedByUserId?: number, ip?: string): Promise<void> {
    const existing = await this.getEmployeeById(id);

    await employeesRepository.softDelete(id);

    // Also deactivate the user login account
    await db('users').where({ id: existing.user_id }).update({ status: 'inactive' });

    await auditService.record({
      userId: performedByUserId,
      action: 'employees.delete',
      entity: 'employees',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }

  public async getStatsSummary() {
    return employeesRepository.getStatsSummary();
  }
}

export const employeesService = new EmployeesService();
export default employeesService;
