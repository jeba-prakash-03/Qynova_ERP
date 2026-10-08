import { Knex } from 'knex';
import db from '../../db/knex';
import { EmployeeRecord, BankDetailsRecord, EmergencyContactRecord } from './employees.types';
import { EmployeeQueryParams } from './employees.schema';

export class EmployeesRepository {
  public async getNextEmployeeCode(trx?: Knex.Transaction): Promise<string> {
    const runner = trx || db;
    // Find the current highest numeric code
    const last = await runner('employees')
      .select('employee_code')
      .orderBy('id', 'desc')
      .first();

    if (!last || !last.employee_code) {
      return 'EMP-0001';
    }

    const match = last.employee_code.match(/EMP-(\d+)/);
    if (!match) {
      return 'EMP-0001';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `EMP-${String(nextNum).padStart(4, '0')}`;
  }

  public async findAll(params: EmployeeQueryParams): Promise<{ data: EmployeeRecord[]; total: number }> {
    const { page, limit, search, department_id, employment_type, status, lifecycle_stage, sort, order } = params;
    const offset = (page - 1) * limit;

    let query = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .leftJoin('employees as m', 'e.reporting_manager_id', 'm.id')
      .whereNull('e.deleted_at');

    if (department_id) {
      query = query.where('e.department_id', department_id);
    }

    if (employment_type) {
      query = query.where('e.employment_type', employment_type);
    }

    if (status) {
      query = query.where('e.status', status);
    }

    if (lifecycle_stage) {
      query = query.where('e.lifecycle_stage', lifecycle_stage);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.where((builder) => {
        builder
          .where('e.first_name', 'like', term)
          .orWhere('e.last_name', 'like', term)
          .orWhere('e.email', 'like', term)
          .orWhere('e.employee_code', 'like', term)
          .orWhere('e.phone', 'like', term);
      });
    }

    // Get total count
    const totalResult = await query.clone().count('e.id as count').first();
    const total = Number(totalResult?.count || 0);

    // Get paginated rows
    const validSortFields = ['created_at', 'first_name', 'last_name', 'joining_date', 'employee_code'];
    const sortField = validSortFields.includes(sort) ? `e.${sort}` : 'e.created_at';

    const rows = await query
      .select(
        'e.*',
        'd.name as department_name',
        'des.name as designation_name',
        db.raw("CONCAT(m.first_name, ' ', m.last_name) as reporting_manager_name")
      )
      .orderBy(sortField, order)
      .offset(offset)
      .limit(limit);

    const formattedRows = rows.map((r) => ({
      ...r,
      skills: typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills,
      experience_years: Number(r.experience_years),
    }));

    return { data: formattedRows, total };
  }

  public async findById(id: number): Promise<EmployeeRecord | undefined> {
    const row = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .leftJoin('employees as m', 'e.reporting_manager_id', 'm.id')
      .where('e.id', id)
      .whereNull('e.deleted_at')
      .select(
        'e.*',
        'd.name as department_name',
        'des.name as designation_name',
        db.raw("CONCAT(m.first_name, ' ', m.last_name) as reporting_manager_name")
      )
      .first();

    if (!row) return undefined;

    const bankDetails = await db('employee_bank_details')
      .where({ employee_id: id })
      .first();

    const emergencyContacts = await db('employee_emergency_contacts')
      .where({ employee_id: id });

    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', row.user_id)
      .select('roles.name');

    return {
      ...row,
      skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills,
      experience_years: Number(row.experience_years),
      bank_details: bankDetails || null,
      emergency_contacts: emergencyContacts || [],
      roles: roles.map((r) => r.name),
    };
  }

  public async findByUserId(userId: number): Promise<EmployeeRecord | undefined> {
    const row = await db('employees').where({ user_id: userId }).whereNull('deleted_at').first();
    if (!row) return undefined;
    return this.findById(Number(row.id));
  }

  public async findByEmail(email: string): Promise<EmployeeRecord | undefined> {
    return db('employees').where({ email: email.toLowerCase().trim() }).whereNull('deleted_at').first();
  }

  public async createInTransaction(
    trx: Knex.Transaction,
    employeeData: Partial<EmployeeRecord>,
    bankDetails?: BankDetailsRecord | null,
    emergencyContacts?: EmergencyContactRecord[] | null
  ): Promise<number> {
    const [empId] = await trx('employees').insert({
      employee_code: employeeData.employee_code,
      user_id: employeeData.user_id,
      first_name: employeeData.first_name,
      last_name: employeeData.last_name,
      photo_url: employeeData.photo_url || null,
      email: employeeData.email,
      phone: employeeData.phone || null,
      date_of_birth: employeeData.date_of_birth || null,
      address: employeeData.address || null,
      department_id: employeeData.department_id || null,
      designation_id: employeeData.designation_id || null,
      reporting_manager_id: employeeData.reporting_manager_id || null,
      joining_date: employeeData.joining_date,
      employment_type: employeeData.employment_type || 'full_time',
      status: employeeData.status || 'active',
      lifecycle_stage: employeeData.lifecycle_stage || 'active',
      skills: employeeData.skills ? JSON.stringify(employeeData.skills) : null,
      experience_years: employeeData.experience_years || 0,
    });

    const employeeId = Number(empId);

    if (bankDetails) {
      await trx('employee_bank_details').insert({
        employee_id: employeeId,
        account_holder: bankDetails.account_holder,
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        ifsc: bankDetails.ifsc,
      });
    }

    if (emergencyContacts && emergencyContacts.length > 0) {
      const contactsToInsert = emergencyContacts.map((c) => ({
        employee_id: employeeId,
        contact_name: c.contact_name,
        relationship: c.relationship,
        phone: c.phone,
        alt_phone: c.alt_phone || null,
        address: c.address || null,
      }));
      await trx('employee_emergency_contacts').insert(contactsToInsert);
    }

    return employeeId;
  }

  public async updateInTransaction(
    trx: Knex.Transaction,
    id: number,
    employeeData: Partial<EmployeeRecord>,
    bankDetails?: BankDetailsRecord | null,
    emergencyContacts?: EmergencyContactRecord[] | null
  ): Promise<void> {
    const updateData: any = {};
    if (employeeData.first_name !== undefined) updateData.first_name = employeeData.first_name;
    if (employeeData.last_name !== undefined) updateData.last_name = employeeData.last_name;
    if (employeeData.photo_url !== undefined) updateData.photo_url = employeeData.photo_url;
    if (employeeData.phone !== undefined) updateData.phone = employeeData.phone;
    if (employeeData.date_of_birth !== undefined) updateData.date_of_birth = employeeData.date_of_birth;
    if (employeeData.address !== undefined) updateData.address = employeeData.address;
    if (employeeData.department_id !== undefined) updateData.department_id = employeeData.department_id;
    if (employeeData.designation_id !== undefined) updateData.designation_id = employeeData.designation_id;
    if (employeeData.reporting_manager_id !== undefined) updateData.reporting_manager_id = employeeData.reporting_manager_id;
    if (employeeData.joining_date !== undefined) updateData.joining_date = employeeData.joining_date;
    if (employeeData.employment_type !== undefined) updateData.employment_type = employeeData.employment_type;
    if (employeeData.status !== undefined) updateData.status = employeeData.status;
    if (employeeData.lifecycle_stage !== undefined) updateData.lifecycle_stage = employeeData.lifecycle_stage;
    if (employeeData.skills !== undefined) updateData.skills = employeeData.skills ? JSON.stringify(employeeData.skills) : null;
    if (employeeData.experience_years !== undefined) updateData.experience_years = employeeData.experience_years;

    if (Object.keys(updateData).length > 0) {
      await trx('employees').where({ id }).update(updateData);
    }

    if (bankDetails) {
      await trx('employee_bank_details').where({ employee_id: id }).del();
      await trx('employee_bank_details').insert({
        employee_id: id,
        account_holder: bankDetails.account_holder,
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        ifsc: bankDetails.ifsc,
      });
    }

    if (emergencyContacts !== undefined && emergencyContacts !== null) {
      await trx('employee_emergency_contacts').where({ employee_id: id }).del();
      if (emergencyContacts.length > 0) {
        const contacts = emergencyContacts.map((c) => ({
          employee_id: id,
          contact_name: c.contact_name,
          relationship: c.relationship,
          phone: c.phone,
          alt_phone: c.alt_phone || null,
          address: c.address || null,
        }));
        await trx('employee_emergency_contacts').insert(contacts);
      }
    }
  }

  public async updateLifecycleStage(id: number, stage: string): Promise<void> {
    await db('employees').where({ id }).update({ lifecycle_stage: stage });
  }

  public async softDelete(id: number): Promise<void> {
    await db('employees').where({ id }).update({
      deleted_at: db.fn.now(),
      status: 'inactive',
    });
  }
}

export const employeesRepository = new EmployeesRepository();
export default employeesRepository;
