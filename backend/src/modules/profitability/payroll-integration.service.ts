import db from '../../db/knex';

export class PayrollIntegrationService {
  /**
   * Retrieves the hourly cost rate for an employee.
   * Reads from active salary_structures (monthly_salary / 176 hours).
   * Defaults to ₹500/hr if no salary structure is defined.
   */
  public async getHourlyCost(employeeId: number): Promise<number> {
    const salary = await db('salary_structures')
      .where({ employee_id: employeeId })
      .orderBy('effective_from', 'desc')
      .first();

    if (!salary) {
      return 500.0; // Default base engineering rate
    }

    const baseSalary = Number(salary.base_salary);
    const monthlySalary = salary.is_annual ? baseSalary / 12 : baseSalary;

    // Standard 22 working days x 8 hours/day = 176 hours/month
    const hourlyRate = monthlySalary / 176;
    return Number(hourlyRate.toFixed(2));
  }
}

export const payrollIntegrationService = new PayrollIntegrationService();
