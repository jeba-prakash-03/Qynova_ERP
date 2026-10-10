import { Request, Response } from 'express';
import { attendanceService } from './attendance.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { ForbiddenError, BadRequestError } from '../../shared/errors/app-error';
import ExcelJS from 'exceljs';

export class AttendanceController {
  public checkIn = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      throw new ForbiddenError('Only authenticated employees can record check-in');
    }
    const result = await attendanceService.checkIn(req.user.employeeId, req.body);
    return sendSuccess(res, result, 201, undefined, 'Check-in recorded successfully');
  });

  public checkOut = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      throw new ForbiddenError('Only authenticated employees can record check-out');
    }
    const result = await attendanceService.checkOut(req.user.employeeId, req.body);
    return sendSuccess(res, result, 200, undefined, 'Check-out recorded successfully');
  });

  public startBreak = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      throw new ForbiddenError('Only authenticated employees can start a break');
    }
    const result = await attendanceService.startBreak(req.user.employeeId);
    return sendSuccess(res, result, 201, undefined, 'Break started successfully');
  });

  public endBreak = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      throw new ForbiddenError('Only authenticated employees can end a break');
    }
    const result = await attendanceService.endBreak(req.user.employeeId);
    return sendSuccess(res, result, 200, undefined, 'Break ended successfully');
  });

  public getToday = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      throw new ForbiddenError('Only authenticated employees have personal attendance records');
    }
    const result = await attendanceService.getToday(req.user.employeeId);
    return sendSuccess(res, result);
  });

  public getMyMonthly = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      throw new ForbiddenError('Only authenticated employees have personal attendance records');
    }
    const month = req.query.month as string | undefined;
    const result = await attendanceService.getMyMonthly(req.user.employeeId, month);
    return sendSuccess(res, result);
  });

  public getDailySheet = asyncHandler(async (req: Request, res: Response) => {
    const { date, department_id, search } = req.query as {
      date: string;
      department_id?: string;
      search?: string;
    };

    if (!date) {
      throw new BadRequestError('Date query parameter is required (YYYY-MM-DD)');
    }

    let reportingManagerId: number | undefined;
    const permissions = req.user?.permissions || [];
    const isFullView = permissions.includes('attendance.view');

    if (!isFullView && permissions.includes('attendance.view_team')) {
      if (!req.user?.employeeId) {
        throw new ForbiddenError('Manager account must have an associated employee record');
      }
      reportingManagerId = req.user.employeeId;
    }

    const result = await attendanceService.getDailySheet({
      date,
      departmentId: department_id ? Number(department_id) : undefined,
      search,
      reportingManagerId,
    });

    return sendSuccess(res, result);
  });

  public getMonthlySheet = asyncHandler(async (req: Request, res: Response) => {
    const { month, department_id, search } = req.query as {
      month: string;
      department_id?: string;
      search?: string;
    };

    if (!month) {
      throw new BadRequestError('Month query parameter is required (YYYY-MM)');
    }

    let reportingManagerId: number | undefined;
    const permissions = req.user?.permissions || [];
    const isFullView = permissions.includes('attendance.view');

    if (!isFullView && permissions.includes('attendance.view_team')) {
      if (!req.user?.employeeId) {
        throw new ForbiddenError('Manager account must have an associated employee record');
      }
      reportingManagerId = req.user.employeeId;
    }

    const result = await attendanceService.getMonthlySheet({
      month,
      departmentId: department_id ? Number(department_id) : undefined,
      search,
      reportingManagerId,
    });

    return sendSuccess(res, result);
  });

  public createManual = asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.createManualAttendance(
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, result, 201, undefined, 'Attendance record created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await attendanceService.updateAttendance(
      id,
      req.body,
      req.user!.userId
    );
    return sendSuccess(res, result, 200, undefined, 'Attendance record updated successfully');
  });

  public exportSheet = asyncHandler(async (req: Request, res: Response) => {
    const { type = 'daily', date, month, format = 'xlsx' } = req.query as {
      type?: 'daily' | 'monthly';
      date?: string;
      month?: string;
      format?: 'xlsx' | 'csv';
    };

    let reportingManagerId: number | undefined;
    const permissions = req.user?.permissions || [];
    if (!permissions.includes('attendance.view') && permissions.includes('attendance.view_team')) {
      reportingManagerId = req.user?.employeeId || undefined;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Qynova ERP';

    if (type === 'daily') {
      const sheetDate = date || new Date().toISOString().split('T')[0];
      const sheetResult = await attendanceService.getDailySheet({
        date: sheetDate,
        reportingManagerId,
      });

      const worksheet = workbook.addWorksheet(`Attendance_${sheetDate}`);
      worksheet.columns = [
        { header: 'Emp Code', key: 'code', width: 14 },
        { header: 'Employee Name', key: 'name', width: 24 },
        { header: 'Department', key: 'dept', width: 18 },
        { header: 'Designation', key: 'desig', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Work Type', key: 'work_type', width: 12 },
        { header: 'Check In', key: 'check_in', width: 20 },
        { header: 'Check Out', key: 'check_out', width: 20 },
        { header: 'Working Hours', key: 'hours', width: 14 },
        { header: 'Late', key: 'is_late', width: 10 },
        { header: 'Early Checkout', key: 'is_early', width: 14 },
      ];

      for (const item of sheetResult.items) {
        worksheet.addRow({
          code: item.employee_code,
          name: `${item.first_name} ${item.last_name}`,
          dept: item.department_name,
          desig: item.designation_title,
          status: item.status.toUpperCase(),
          work_type: item.work_type.toUpperCase(),
          check_in: item.check_in ? new Date(item.check_in).toLocaleTimeString('en-IN') : '-',
          check_out: item.check_out ? new Date(item.check_out).toLocaleTimeString('en-IN') : '-',
          hours: (item.working_minutes / 60).toFixed(1) + ' hrs',
          is_late: item.is_late ? 'YES' : 'NO',
          is_early: item.is_early_checkout ? 'YES' : 'NO',
        });
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="attendance_daily_${sheetDate}.${format}"`
      );
    } else {
      const sheetMonth = month || new Date().toISOString().slice(0, 7);
      const monthlyResult = await attendanceService.getMonthlySheet({
        month: sheetMonth,
        reportingManagerId,
      });

      const worksheet = workbook.addWorksheet(`Attendance_${sheetMonth}`);
      const columns: any[] = [
        { header: 'Emp Code', key: 'code', width: 14 },
        { header: 'Employee Name', key: 'name', width: 24 },
        { header: 'Department', key: 'dept', width: 18 },
      ];

      for (let d = 1; d <= monthlyResult.totalDays; d++) {
        columns.push({ header: `${d}`, key: `d_${d}`, width: 6 });
      }

      columns.push(
        { header: 'Present', key: 'tot_p', width: 10 },
        { header: 'Absent', key: 'tot_a', width: 10 },
        { header: 'Half Day', key: 'tot_hd', width: 10 },
        { header: 'Total Hrs', key: 'tot_hrs', width: 12 }
      );

      worksheet.columns = columns;

      for (const emp of monthlyResult.employees) {
        const rowData: Record<string, any> = {
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}`,
          dept: emp.department_name,
          tot_p: emp.totals.present,
          tot_a: emp.totals.absent,
          tot_hd: emp.totals.half_day,
          tot_hrs: (emp.totals.total_working_minutes / 60).toFixed(1),
        };

        const pad = (n: number) => n.toString().padStart(2, '0');
        for (let d = 1; d <= monthlyResult.totalDays; d++) {
          const dateStr = `${sheetMonth}-${pad(d)}`;
          const dayInfo = emp.days[dateStr];
          rowData[`d_${d}`] = dayInfo ? dayInfo.statusCode : '-';
        }

        worksheet.addRow(rowData);
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="attendance_monthly_${sheetMonth}.${format}"`
      );
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      await workbook.csv.write(res);
    } else {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await workbook.xlsx.write(res);
    }
    return res.end();
  });
}

export const attendanceController = new AttendanceController();
