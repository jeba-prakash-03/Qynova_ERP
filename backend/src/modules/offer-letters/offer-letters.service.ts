import path from 'path';
import fs from 'fs';
import db from '../../db/knex';
import { offerLettersRepository } from './offer-letters.repository';
import {
  GenerateOfferLetterInput,
  OfferLetterRecord,
  OfferLetterSnapshot,
  OfferLetterTemplateRecord,
} from './offer-letters.types';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';
import emailService from '../../shared/services/email.service';
import { generateOfferLetterPdf } from './offer-letters.pdf';
import { TokenUserPayload } from '../../shared/utils/jwt.util';

export class OfferLettersService {
  public repository = offerLettersRepository;
  // ==========================================
  // TEMPLATES
  // ==========================================
  async listTemplates(): Promise<OfferLetterTemplateRecord[]> {
    return offerLettersRepository.listTemplates();
  }

  async getTemplateById(id: number): Promise<OfferLetterTemplateRecord> {
    const template = await offerLettersRepository.findTemplateById(id);
    if (!template) {
      throw new NotFoundError(`Offer letter template #${id} not found`);
    }
    return template;
  }

  async createTemplate(
    input: { name: string; subject: string; body_html: string; is_default?: boolean },
    userId: number
  ): Promise<OfferLetterTemplateRecord> {
    const sanitizedHtml = this.sanitizeHtml(input.body_html);
    let isDefault = Boolean(input.is_default);

    // If first template, force default
    const existing = await offerLettersRepository.listTemplates();
    if (existing.length === 0) {
      isDefault = true;
    }

    if (isDefault) {
      await offerLettersRepository.clearOtherDefaults();
    }

    const id = await offerLettersRepository.createTemplate({
      name: input.name.trim(),
      subject: input.subject.trim(),
      body_html: sanitizedHtml,
      is_default: isDefault,
      created_by: userId,
    });

    await auditService.record({
      userId,
      action: 'offer_letter_templates.create',
      entity: 'offer_letter_templates',
      entityId: id,
      newValue: { name: input.name, is_default: isDefault },
    });

    return (await offerLettersRepository.findTemplateById(id))!;
  }

  async updateTemplate(
    id: number,
    input: { name?: string; subject?: string; body_html?: string; is_default?: boolean },
    userId: number
  ): Promise<OfferLetterTemplateRecord> {
    const existing = await this.getTemplateById(id);

    if (input.is_default) {
      await offerLettersRepository.clearOtherDefaults(id);
    }

    const updateData: Partial<OfferLetterTemplateRecord> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.subject !== undefined) updateData.subject = input.subject.trim();
    if (input.body_html !== undefined) updateData.body_html = this.sanitizeHtml(input.body_html);
    if (input.is_default !== undefined) updateData.is_default = input.is_default;

    await offerLettersRepository.updateTemplate(id, updateData);

    await auditService.record({
      userId,
      action: 'offer_letter_templates.update',
      entity: 'offer_letter_templates',
      entityId: id,
      oldValue: existing,
      newValue: updateData,
    });

    return (await offerLettersRepository.findTemplateById(id))!;
  }

  async duplicateTemplate(id: number, userId: number): Promise<OfferLetterTemplateRecord> {
    const source = await this.getTemplateById(id);
    const newName = `${source.name} (Copy)`;

    const newId = await offerLettersRepository.createTemplate({
      name: newName,
      subject: source.subject,
      body_html: source.body_html,
      is_default: false,
      created_by: userId,
    });

    await auditService.record({
      userId,
      action: 'offer_letter_templates.duplicate',
      entity: 'offer_letter_templates',
      entityId: newId,
      newValue: { sourceId: id, name: newName },
    });

    return (await offerLettersRepository.findTemplateById(newId))!;
  }

  async setDefaultTemplate(id: number, userId: number): Promise<OfferLetterTemplateRecord> {
    await this.getTemplateById(id);
    await offerLettersRepository.clearOtherDefaults(id);
    await offerLettersRepository.updateTemplate(id, { is_default: true });

    await auditService.record({
      userId,
      action: 'offer_letter_templates.set_default',
      entity: 'offer_letter_templates',
      entityId: id,
    });

    return (await offerLettersRepository.findTemplateById(id))!;
  }

  async deleteTemplate(id: number, userId: number): Promise<void> {
    const template = await this.getTemplateById(id);
    if (template.is_default) {
      throw new BadRequestError('Cannot delete the default template', [
        { field: 'id', message: 'The default template cannot be deleted. Set another template as default first.' },
      ]);
    }

    await offerLettersRepository.deleteTemplate(id);

    await auditService.record({
      userId,
      action: 'offer_letter_templates.delete',
      entity: 'offer_letter_templates',
      entityId: id,
      oldValue: template,
    });
  }

  // ==========================================
  // OFFER LETTER GENERATION
  // ==========================================
  async generateOfferLetter(
    input: GenerateOfferLetterInput,
    currentUser: TokenUserPayload,
    ip?: string
  ): Promise<OfferLetterRecord> {
    const employeeId = input.employee_id;

    // 1. Fetch Employee
    const employee = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .leftJoin('employees as m', 'e.reporting_manager_id', 'm.id')
      .select(
        'e.*',
        'd.name as department_name',
        'des.name as designation_title',
        db.raw("CONCAT(m.first_name, ' ', m.last_name) as reporting_manager_name")
      )
      .where('e.id', employeeId)
      .whereNull('e.deleted_at')
      .first();

    if (!employee) {
      throw new NotFoundError(`Employee #${employeeId} not found`);
    }

    // 2. Validate Required Fields (block generation if missing)
    const designation = input.designation || employee.designation_title;
    if (!designation) {
      throw new BadRequestError('Designation is required to generate an offer letter', [
        {
          field: 'designation',
          message: 'Employee designation is required. Please set a designation on the employee profile or input form.',
        },
      ]);
    }

    const joiningDate = input.joining_date || employee.joining_date;
    if (!joiningDate) {
      throw new BadRequestError('Joining date is required to generate an offer letter', [
        {
          field: 'joining_date',
          message: 'Joining date is required. Please set a joining date on the employee profile.',
        },
      ]);
    }

    // Check salary structure or input salaries
    let monthlyGross = input.monthly_gross ? Number(input.monthly_gross) : 0;
    let annualCtc = input.annual_ctc ? Number(input.annual_ctc) : 0;

    if (!monthlyGross || !annualCtc) {
      const salaryStruct = await db('salary_structures')
        .where({ employee_id: employeeId })
        .orderBy('effective_from', 'desc')
        .first();

      if (salaryStruct) {
        if (salaryStruct.is_annual) {
          annualCtc = Number(salaryStruct.base_salary);
          monthlyGross = Math.round((annualCtc / 12) * 100) / 100;
        } else {
          monthlyGross = Number(salaryStruct.base_salary);
          annualCtc = Math.round(monthlyGross * 12 * 100) / 100;
        }
      }
    }

    if (!monthlyGross || !annualCtc || monthlyGross <= 0 || annualCtc <= 0) {
      throw new BadRequestError('Employee must have an active salary structure', [
        {
          field: 'salary_structure',
          message: 'Employee does not have an active salary structure. Please configure salary in Payroll or employee creation.',
        },
      ]);
    }

    // 3. Compute Salary Breakup
    const basic = Math.round(monthlyGross * 0.5 * 100) / 100;
    const hra = Math.round(basic * 0.4 * 100) / 100; // 20% of gross
    const specialAllowance = Math.round((monthlyGross - basic - hra) * 100) / 100;
    const pf = Math.round(basic * 0.12 * 100) / 100;

    const salaryBreakup = {
      basic,
      hra,
      special_allowance: specialAllowance,
      gross: monthlyGross,
      pf,
      annual_ctc: annualCtc,
    };

    // 4. Fetch Company Settings
    const companySettings = (await db('company_settings').where({ id: 1 }).first()) || {
      company_name: 'Qynova Technologies',
      address_line1: 'Corporate Tower',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pincode: '600032',
      signatory_name: 'Authorized Signatory',
      signatory_designation: 'Head of Human Resources',
      currency: 'INR',
    };

    const companyAddress = [
      companySettings.address_line1,
      companySettings.address_line2,
      companySettings.city,
      companySettings.state,
      companySettings.pincode,
      companySettings.country,
    ]
      .filter(Boolean)
      .join(', ');

    // 5. Template and Variable Substitution
    let template: OfferLetterTemplateRecord | null = null;
    if (input.template_id) {
      template = await offerLettersRepository.findTemplateById(input.template_id);
    }
    if (!template) {
      template = await offerLettersRepository.findDefaultTemplate();
    }

    const todayDate = this.getTodayKolkata();
    const defaultValidUntil = this.addDays(todayDate, 7);
    const offerValidUntil = input.offer_valid_until || defaultValidUntil;
    const probationMonths = input.probation_months !== undefined ? input.probation_months : 3;
    const noticePeriodDays = input.notice_period_days !== undefined ? input.notice_period_days : 30;
    const workLocation = input.work_location || 'Headquarters';
    const workingHours = input.working_hours || '9:30 AM - 6:30 PM (Mon-Fri)';
    const reportingManager = input.reporting_manager || employee.reporting_manager_name || 'Department Head';
    const departmentName = input.department || employee.department_name || 'General';
    const employmentType = input.employment_type || employee.employment_type || 'full_time';

    const referenceNo = await offerLettersRepository.getNextReferenceNo();

    // Format currency strings
    const formatInr = (n: number) =>
      `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const breakupTableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Salary Component</th>
      <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">Monthly (INR)</th>
      <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">Annual (INR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Basic Salary (50%)</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(basic)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(basic * 12)}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">House Rent Allowance (HRA - 20%)</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(hra)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(hra * 12)}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Special Allowance</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(specialAllowance)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(specialAllowance * 12)}</td>
    </tr>
    <tr style="font-weight: bold; background-color: #f8fafc;">
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Total Cost to Company (CTC)</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(monthlyGross)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right;">${formatInr(annualCtc)}</td>
    </tr>
  </tbody>
</table>`;

    const variableMap: Record<string, string> = {
      '{{company_name}}': companySettings.company_name,
      '{{company_address}}': companyAddress,
      '{{letter_date}}': todayDate,
      '{{reference_no}}': referenceNo,
      '{{employee_name}}': `${employee.first_name} ${employee.last_name}`,
      '{{employee_address}}': employee.address || 'Address on file',
      '{{designation}}': designation,
      '{{department}}': departmentName,
      '{{joining_date}}': joiningDate,
      '{{employment_type}}': employmentType.replace('_', ' ').toUpperCase(),
      '{{monthly_gross}}': formatInr(monthlyGross),
      '{{annual_ctc}}': formatInr(annualCtc),
      '{{salary_breakup_table}}': breakupTableHtml,
      '{{probation_months}}': String(probationMonths),
      '{{reporting_manager}}': reportingManager,
      '{{work_location}}': workLocation,
      '{{working_hours}}': workingHours,
      '{{notice_period_days}}': String(noticePeriodDays),
      '{{offer_valid_until}}': offerValidUntil,
      '{{signatory_name}}': companySettings.signatory_name || 'Authorized Signatory',
      '{{signatory_designation}}': companySettings.signatory_designation || 'Head of HR',
    };

    let rawBody = input.custom_body_html || template?.body_html || '';
    for (const [token, val] of Object.entries(variableMap)) {
      rawBody = rawBody.split(token).join(val);
    }

    const renderedHtml = this.sanitizeHtml(rawBody);

    // 6. Build Snapshot
    const snapshot: OfferLetterSnapshot = {
      reference_no: referenceNo,
      letter_date: todayDate,
      company_name: companySettings.company_name,
      company_address: companyAddress,
      company_email: companySettings.email || companySettings.support_email,
      company_phone: companySettings.phone,
      company_website: companySettings.website,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      employee_email: employee.email,
      employee_phone: employee.phone,
      employee_address: employee.address,
      designation,
      department: departmentName,
      joining_date: joiningDate,
      employment_type: employmentType,
      monthly_gross: monthlyGross,
      annual_ctc: annualCtc,
      salary_breakup: salaryBreakup,
      probation_months: probationMonths,
      reporting_manager: reportingManager,
      work_location: workLocation,
      working_hours: workingHours,
      notice_period_days: noticePeriodDays,
      offer_valid_until: offerValidUntil,
      signatory_name: companySettings.signatory_name || 'Authorized Signatory',
      signatory_designation: companySettings.signatory_designation || 'Head of HR',
      signature_image_path: companySettings.signature_image_path,
      payslip_footer_text: companySettings.payslip_footer_text,
      rendered_html: renderedHtml,
    };

    // 7. Versioning & Superseded Handling
    const existingLetters = await offerLettersRepository.findHistoryByEmployeeId(employeeId);
    let nextVersion = 1;
    let oldLetterToSupersede: OfferLetterRecord | null = null;

    if (existingLetters.length > 0) {
      const highestVersion = Math.max(...existingLetters.map((l) => l.version));
      const activeLetters = existingLetters.filter(
        (l) => !['superseded', 'declined', 'expired'].includes(l.status)
      );

      if (activeLetters.length > 0) {
        oldLetterToSupersede = activeLetters[0];
        nextVersion = highestVersion + 1;
      } else {
        nextVersion = highestVersion + 1;
      }
    }

    // 8. Generate PDF
    const uploadBase = process.env.UPLOAD_DIR || path.join(process.cwd(), 'storage');
    const pdfDir = path.join(uploadBase, 'documents', 'offer-letters');
    const pdfFilename = `${referenceNo}_v${nextVersion}.pdf`;
    const pdfFilePath = path.join(pdfDir, pdfFilename);

    await generateOfferLetterPdf({
      snapshot,
      outputPath: pdfFilePath,
    });

    const status = input.save_as_draft ? 'draft' : 'generated';

    // 9. Database Updates in Transaction
    let createdId = 0;
    await db.transaction(async (trx) => {
      if (oldLetterToSupersede) {
        await trx('offer_letters')
          .where({ id: oldLetterToSupersede.id })
          .update({
            status: 'superseded',
            updated_at: db.fn.now(),
          });
      }

      const [newId] = await trx('offer_letters').insert({
        reference_no: referenceNo,
        employee_id: employeeId,
        template_id: template?.id || null,
        version: nextVersion,
        status,
        joining_date: joiningDate,
        designation,
        department: departmentName,
        employment_type: employmentType,
        monthly_gross: monthlyGross,
        annual_ctc: annualCtc,
        probation_months: probationMonths,
        work_location: workLocation,
        working_hours: workingHours,
        notice_period_days: noticePeriodDays,
        offer_valid_until: offerValidUntil,
        generated_by: currentUser.userId,
        generated_at: status === 'generated' ? db.fn.now() : null,
        file_path: pdfFilePath,
        snapshot: JSON.stringify(snapshot),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      createdId = Number(newId);

      // Lifecycle Linkage: only if currently candidate or selected; never move backwards
      if (status === 'generated') {
        const currentStage = employee.lifecycle_stage;
        if (['candidate', 'selected'].includes(currentStage)) {
          await trx('employees')
            .where({ id: employeeId })
            .update({ lifecycle_stage: 'offer_generated', updated_at: db.fn.now() });

          await trx('employee_lifecycle_history').insert({
            employee_id: employeeId,
            from_stage: currentStage,
            to_stage: 'offer_generated',
            changed_by: currentUser.userId,
            note: `Offer letter ${referenceNo} generated (version ${nextVersion})`,
            created_at: db.fn.now(),
          });
        }
      }
    });

    // 10. Audit Log
    await auditService.record({
      userId: currentUser.userId,
      action: 'offer_letters.generate',
      entity: 'offer_letters',
      entityId: createdId,
      newValue: {
        reference_no: referenceNo,
        employee_id: employeeId,
        version: nextVersion,
        status,
        file_path: pdfFilePath,
      },
      ip,
    });

    return (await offerLettersRepository.findOfferLetterById(createdId))!;
  }

  // ==========================================
  // SEND OFFER LETTER
  // ==========================================
  async sendOfferLetter(
    id: number,
    currentUser: TokenUserPayload,
    options?: { recipient_email?: string; custom_message?: string },
    ip?: string
  ): Promise<OfferLetterRecord> {
    const letter = await offerLettersRepository.findOfferLetterById(id);
    if (!letter) {
      throw new NotFoundError(`Offer letter #${id} not found`);
    }

    if (letter.status === 'draft') {
      throw new BadRequestError('Draft offer letters must be generated before sending', [
        { field: 'status', message: 'Letter is in draft status. Generate the letter first.' },
      ]);
    }

    const employee = await db('employees').where({ id: letter.employee_id }).first();
    const recipientEmail = options?.recipient_email || employee?.email;
    if (!recipientEmail) {
      throw new BadRequestError('Recipient email is missing', [
        { field: 'recipient_email', message: 'No valid recipient email address found.' },
      ]);
    }

    const companySettings = (await db('company_settings').where({ id: 1 }).first()) || {
      company_name: 'Qynova Technologies',
    };

    const emailSubject = `Offer of Employment: ${letter.designation} at ${companySettings.company_name}`;
    const emailBody = `<p>Dear ${employee?.first_name || 'Candidate'},</p>
<p>We are delighted to extend an offer of employment with <strong>${companySettings.company_name}</strong> for the position of <strong>${letter.designation}</strong>.</p>
<p>Please find attached your official offer letter (Reference: <strong>${letter.reference_no}</strong>). Kindly review the terms and conditions and confirm your acceptance before <strong>${letter.offer_valid_until}</strong>.</p>
${options?.custom_message ? `<p>${options.custom_message}</p>` : ''}
<p>Best regards,<br/>
<strong>${companySettings.company_name} HR Team</strong></p>`;

    // Queue in email_outbox with attachment
    const attachments = letter.file_path && fs.existsSync(letter.file_path)
      ? [{ filename: `Offer_Letter_${letter.reference_no}.pdf`, path: letter.file_path }]
      : undefined;

    await emailService.queueEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailBody,
      eventKey: `offer-letter-send-${letter.id}-${letter.version}`,
    });

    // Update letter status
    await offerLettersRepository.updateOfferLetter(letter.id, {
      status: 'sent',
      sent_at: db.fn.now(),
    });

    // In-app notification for HR
    const hrUsers = await db('users as u')
      .join('user_roles as ur', 'u.id', 'ur.user_id')
      .join('roles as r', 'ur.role_id', 'r.id')
      .whereIn('r.name', ['HR', 'Admin'])
      .select('u.id');

    const hrUserIds = Array.from(new Set(hrUsers.map((u) => Number(u.id))));
    if (hrUserIds.length > 0) {
      await notificationService.notify({
        eventKey: `offer-letter:${letter.id}:sent`,
        userIds: hrUserIds,
        type: 'info',
        title: 'Offer Letter Sent',
        message: `Offer letter ${letter.reference_no} has been dispatched to ${employee?.first_name} ${employee?.last_name} (${recipientEmail}).`,
        link: `/employees/${letter.employee_id}`,
      });
    }

    // Audit log
    await auditService.record({
      userId: currentUser.userId,
      action: 'offer_letters.send',
      entity: 'offer_letters',
      entityId: letter.id,
      newValue: { status: 'sent', sent_at: new Date().toISOString(), recipient: recipientEmail },
      ip,
    });

    return (await offerLettersRepository.findOfferLetterById(letter.id))!;
  }

  // ==========================================
  // STATUS TRANSITIONS (ACCEPT / DECLINE)
  // ==========================================
  async markAccepted(
    id: number,
    currentUser: TokenUserPayload,
    ip?: string
  ): Promise<OfferLetterRecord> {
    const letter = await offerLettersRepository.findOfferLetterById(id);
    if (!letter) {
      throw new NotFoundError(`Offer letter #${id} not found`);
    }

    await db.transaction(async (trx) => {
      await trx('offer_letters')
        .where({ id })
        .update({
          status: 'accepted',
          accepted_at: db.fn.now(),
          updated_at: db.fn.now(),
        });

      // Update employee lifecycle stage to offer_accepted
      const emp = await trx('employees').where({ id: letter.employee_id }).first();
      if (emp) {
        await trx('employees')
          .where({ id: letter.employee_id })
          .update({ lifecycle_stage: 'offer_accepted', updated_at: db.fn.now() });

        await trx('employee_lifecycle_history').insert({
          employee_id: letter.employee_id,
          from_stage: emp.lifecycle_stage,
          to_stage: 'offer_accepted',
          changed_by: currentUser.userId,
          note: `Offer letter ${letter.reference_no} marked as accepted`,
          created_at: db.fn.now(),
        });
      }
    });

    await auditService.record({
      userId: currentUser.userId,
      action: 'offer_letters.accept',
      entity: 'offer_letters',
      entityId: id,
      newValue: { status: 'accepted' },
      ip,
    });

    return (await offerLettersRepository.findOfferLetterById(id))!;
  }

  async markDeclined(
    id: number,
    reason: string,
    currentUser: TokenUserPayload,
    ip?: string
  ): Promise<OfferLetterRecord> {
    const letter = await offerLettersRepository.findOfferLetterById(id);
    if (!letter) {
      throw new NotFoundError(`Offer letter #${id} not found`);
    }

    await db.transaction(async (trx) => {
      await trx('offer_letters')
        .where({ id })
        .update({
          status: 'declined',
          decline_reason: reason,
          updated_at: db.fn.now(),
        });

      // Set employee status to inactive with reason
      await trx('employees')
        .where({ id: letter.employee_id })
        .update({
          status: 'inactive',
          updated_at: db.fn.now(),
        });
    });

    await auditService.record({
      userId: currentUser.userId,
      action: 'offer_letters.decline',
      entity: 'offer_letters',
      entityId: id,
      newValue: { status: 'declined', reason },
      ip,
    });

    return (await offerLettersRepository.findOfferLetterById(id))!;
  }

  // ==========================================
  // EMPLOYEE ACCESS & DOWNLOAD
  // ==========================================
  async getMyOfferLetter(employeeId: number): Promise<OfferLetterRecord | null> {
    const letter = await offerLettersRepository.findLatestByEmployeeId(employeeId);
    if (!letter || !['sent', 'accepted'].includes(letter.status)) {
      return null;
    }
    return letter;
  }

  async getPdfFilePath(id: number, currentUser: TokenUserPayload): Promise<string> {
    const letter = await offerLettersRepository.findOfferLetterById(id);
    if (!letter) {
      throw new NotFoundError(`Offer letter #${id} not found`);
    }

    const isAdminOrHr = currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('offer_letters.view') ||
      currentUser.permissions.includes('*');

    // Strict ownership verification for regular employees
    if (!isAdminOrHr) {
      if (letter.employee_id !== currentUser.employeeId) {
        throw new ForbiddenError('You do not have permission to access this offer letter');
      }
      if (!['sent', 'accepted'].includes(letter.status)) {
        throw new ForbiddenError('This offer letter has not been released yet');
      }
    }

    if (!letter.file_path || !fs.existsSync(letter.file_path)) {
      throw new NotFoundError('Offer letter PDF file not found on disk');
    }

    return letter.file_path;
  }

  // ==========================================
  // DAILY CRON JOBS
  // ==========================================
  async expireStaleOffers(): Promise<number> {
    const today = this.getTodayKolkata();
    const expiredCount = await db('offer_letters')
      .where('status', 'sent')
      .where('offer_valid_until', '<', today)
      .update({
        status: 'expired',
        updated_at: db.fn.now(),
      });
    return expiredCount;
  }

  async activateOnboardingEmployees(): Promise<number> {
    const today = this.getTodayKolkata();
    const employees = await db('employees as e')
      .leftJoin('offer_letters as o', function () {
        this.on('e.id', '=', 'o.employee_id').andOn('o.status', '=', db.raw("'accepted'"));
      })
      .select('e.id', 'e.user_id', 'e.joining_date', 'e.first_name', 'e.last_name', 'o.probation_months')
      .where('e.lifecycle_stage', 'onboarding')
      .where('e.joining_date', '<=', today);

    let count = 0;
    for (const emp of employees) {
      const probationMonths = emp.probation_months !== null && emp.probation_months !== undefined ? Number(emp.probation_months) : 3;
      const targetStage = probationMonths > 0 ? 'probation' : 'active';

      await db.transaction(async (trx) => {
        await trx('employees')
          .where({ id: emp.id })
          .update({
            lifecycle_stage: targetStage,
            updated_at: db.fn.now(),
          });

        await trx('employee_lifecycle_history').insert({
          employee_id: emp.id,
          from_stage: 'onboarding',
          to_stage: targetStage,
          changed_by: emp.user_id,
          note: `Automated transition on joining date (${emp.joining_date}) to ${targetStage}`,
          created_at: db.fn.now(),
        });
      });

      // Send HR Notification
      const hrUsers = await db('users as u')
        .join('user_roles as ur', 'u.id', 'ur.user_id')
        .join('roles as r', 'ur.role_id', 'r.id')
        .whereIn('r.name', ['HR', 'Admin'])
        .select('u.id');

      const hrUserIds = Array.from(new Set(hrUsers.map((u) => Number(u.id))));
      if (hrUserIds.length > 0) {
        await notificationService.notify({
          eventKey: `employee:${emp.id}:activated-on-joining`,
          userIds: hrUserIds,
          type: 'info',
          title: 'Employee Activated on Joining Date',
          message: `${emp.first_name} ${emp.last_name} has joined today and moved from Onboarding to ${targetStage.toUpperCase()}.`,
          link: `/employees/${emp.id}`,
        });
      }

      count++;
    }

    return count;
  }

  // ==========================================
  // HELPERS
  // ==========================================
  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  }

  private getTodayKolkata(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}

export const offerLettersService = new OfferLettersService();
export default offerLettersService;
