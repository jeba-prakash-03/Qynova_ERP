import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { documentsRepository } from './documents.repository';
import {
  EmployeeDocument,
  DocumentType,
  SENSITIVE_DOCUMENT_TYPES,
  GenerateOfferLetterDto,
} from './documents.types';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { employeesRepository } from '../employees/employees.repository';
import { DOCUMENTS_STORAGE_DIR } from './documents.middleware';
import db from '../../db/knex';

export interface CurrentUserPayload {
  userId: number;
  employeeId: number | null;
  roles: string[];
  permissions: string[];
}

export class DocumentsService {
  /**
   * Upload an employee document
   */
  async uploadDocument(
    employeeId: number,
    file: Express.Multer.File,
    type: DocumentType,
    currentUser: CurrentUserPayload,
    ip?: string
  ): Promise<EmployeeDocument> {
    const employee = await employeesRepository.findById(employeeId);
    if (!employee) {
      // Clean up uploaded file if employee doesn't exist
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new NotFoundError('Employee not found');
    }

    const validTypes: DocumentType[] = [
      'aadhaar',
      'pan',
      'resume',
      'offer_letter',
      'joining_letter',
      'experience_letter',
      'salary_document',
      'certificate',
      'other',
    ];

    if (!validTypes.includes(type)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new BadRequestError(`Invalid document type '${type}'`);
    }

    // Permission check for uploading
    const isAdminOrHr =
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('documents.create') ||
      currentUser.permissions.includes('*');
    const isOwner = currentUser.employeeId === employeeId;

    if (!isAdminOrHr && !isOwner) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new ForbiddenError('You can only upload documents for yourself or as HR/Admin');
    }

    const doc = await documentsRepository.create({
      employee_id: employeeId,
      type,
      file_name: file.originalname,
      file_path: file.path,
      mime_type: file.mimetype,
      size: file.size,
      uploaded_by: currentUser.userId,
    });

    await auditService.record({
      userId: currentUser.userId,
      action: 'documents.upload',
      entity: 'employee_documents',
      entityId: doc.id,
      newValue: {
        employee_id: employeeId,
        type,
        file_name: file.originalname,
        size: file.size,
      },
      ip,
    });

    return doc;
  }

  /**
   * Get all documents for an employee
   * Redacts sensitive types (aadhaar, pan, salary_document) if not Admin/HR or owner
   */
  async getEmployeeDocuments(
    employeeId: number,
    currentUser: CurrentUserPayload
  ): Promise<EmployeeDocument[]> {
    const employee = await employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const isOwner = currentUser.employeeId === employeeId;
    const isAdminOrHr =
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('*');

    const docs = await documentsRepository.findByEmployeeId(employeeId);

    // Filter sensitive documents if not Admin, HR, or the owner
    return docs
      .filter((doc) => {
        if (SENSITIVE_DOCUMENT_TYPES.includes(doc.type)) {
          return isAdminOrHr || isOwner;
        }
        return true;
      })
      .map((doc) => ({
        ...doc,
        is_sensitive: SENSITIVE_DOCUMENT_TYPES.includes(doc.type),
      }));
  }

  /**
   * Get single document for download with strict security checks
   */
  async getDocumentForDownload(
    id: number,
    currentUser: CurrentUserPayload
  ): Promise<EmployeeDocument> {
    const doc = await documentsRepository.findById(id);
    if (!doc) {
      throw new NotFoundError(`Document with ID ${id} not found`);
    }

    const isOwner = currentUser.employeeId === doc.employee_id;
    const isAdminOrHr =
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('*');

    // Sensitive check
    if (SENSITIVE_DOCUMENT_TYPES.includes(doc.type)) {
      if (!isAdminOrHr && !isOwner) {
        throw new ForbiddenError(
          'Access to sensitive documents (Aadhaar, PAN, Salary) is restricted to Admin, HR, and the document owner.'
        );
      }
    } else {
      // General document permission check
      const canView =
        isAdminOrHr ||
        isOwner ||
        currentUser.permissions.includes('documents.view') ||
        currentUser.permissions.includes('employees.documents.view');

      if (!canView) {
        throw new ForbiddenError('You do not have permission to view or download this document.');
      }
    }

    if (!fs.existsSync(doc.file_path)) {
      throw new NotFoundError('Document file not found on disk');
    }

    return doc;
  }

  /**
   * Delete document and log audit trail
   */
  async deleteDocument(
    id: number,
    currentUser: CurrentUserPayload,
    ip?: string
  ): Promise<void> {
    const doc = await documentsRepository.findById(id);
    if (!doc) {
      throw new NotFoundError(`Document with ID ${id} not found`);
    }

    const isAdminOrHr =
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('documents.delete') ||
      currentUser.permissions.includes('*');

    if (!isAdminOrHr) {
      throw new ForbiddenError('Only Admin or HR can delete employee documents.');
    }

    // Delete file from disk if exists
    if (fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (err) {
        console.error(`[DOCUMENT_DELETE_ERR] Failed to delete file ${doc.file_path}:`, err);
      }
    }

    // Delete database record
    await documentsRepository.delete(id);

    // Audit log
    await auditService.record({
      userId: currentUser.userId,
      action: 'documents.delete',
      entity: 'employee_documents',
      entityId: id,
      oldValue: doc,
      ip,
    });
  }

  /**
   * Generate Offer Letter PDF from template
   */
  async generateOfferLetter(
    employeeId: number,
    currentUser: CurrentUserPayload,
    details?: GenerateOfferLetterDto,
    ip?: string
  ): Promise<EmployeeDocument> {
    const employee = await employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const isAdminOrHr =
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('employees.edit') ||
      currentUser.permissions.includes('*');

    if (!isAdminOrHr) {
      throw new ForbiddenError('Only Admin or HR can generate offer letters.');
    }

    const candidateName = `${employee.first_name} ${employee.last_name}`;
    const designation = details?.designation_name || employee.designation_name || 'Software Engineer';
    const department = employee.department_name || 'Engineering';
    const joiningDate = details?.joining_date || employee.joining_date || new Date().toISOString().split('T')[0];
    const salary = details?.salary_ctc || '₹12,00,000 / annum (INR)';

    // PDF file path
    const randomFileName = `offer_letter_${crypto.randomUUID()}.pdf`;
    const filePath = path.join(DOCUMENTS_STORAGE_DIR, randomFileName);
    const downloadName = `Offer_Letter_${employee.first_name}_${employee.last_name}.pdf`;

    // Generate PDF
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('QYNOVA TECHNOLOGIES PRIVATE LIMITED', { align: 'center' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Tech Park, Guindy, Chennai, Tamil Nadu - 600032 | hr@qynova.erp', { align: 'center' });

      doc.moveDown(1.5);
      doc
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(560, doc.y)
        .stroke();

      doc.moveDown(1.5);

      // Date & Reference
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`Date: ${new Date().toLocaleDateString('en-GB')}`);
      doc.text(`Reference: QYN/OFFER/${new Date().getFullYear()}/${employee.employee_code}`);

      doc.moveDown(1);

      // Salutation
      doc.text(`Dear ${candidateName},`);
      doc.moveDown(0.8);

      // Body
      doc
        .font('Helvetica')
        .text(
          `We are delighted to offer you the position of ${designation} in the ${department} department at Qynova Technologies Pvt. Ltd.`
        );

      doc.moveDown(0.8);
      doc.text(
        'Following your technical and HR evaluations, we were highly impressed by your qualifications, capabilities, and professional approach.'
      );

      doc.moveDown(1);
      doc.font('Helvetica-Bold').text('Terms of Employment:');
      doc.moveDown(0.5);

      doc.font('Helvetica');
      doc.text(`• Position / Role: ${designation}`);
      doc.text(`• Department: ${department}`);
      doc.text(`• Date of Joining: ${joiningDate}`);
      doc.text(`• Employment Type: Full-Time Permanent`);
      doc.text(`• Total Annual CTC: ${salary}`);
      doc.text(`• Work Location: Chennai, India / Hybrid`);

      doc.moveDown(1);
      doc.text(
        'Please review the terms of this offer. To confirm your acceptance, kindly sign and return a duplicate copy of this letter along with the required onboarding documentation prior to your joining date.'
      );

      doc.moveDown(1.5);
      doc.text('We look forward to welcoming you to the Qynova team and achieving great milestones together.');

      doc.moveDown(2);
      doc.font('Helvetica-Bold').text('For Qynova Technologies Pvt. Ltd.');
      doc.moveDown(2.5);
      doc.font('Helvetica').text('Authorized Signatory / Human Resources');

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    const stats = fs.statSync(filePath);

    // Save into employee_documents
    const createdDoc = await documentsRepository.create({
      employee_id: employeeId,
      type: 'offer_letter',
      file_name: downloadName,
      file_path: filePath,
      mime_type: 'application/pdf',
      size: stats.size,
      uploaded_by: currentUser.userId,
    });

    // If employee is in 'selected' stage, advance lifecycle to 'offer_generated'
    if (employee.lifecycle_stage === 'selected') {
      await db.transaction(async (trx) => {
        await employeesRepository.recordLifecycleTransition(
          employeeId,
          'selected',
          'offer_generated',
          currentUser.userId,
          'Offer letter generated and issued',
          trx
        );
        await employeesRepository.updateLifecycleStage(employeeId, 'offer_generated', trx);
      });
    }

    await auditService.record({
      userId: currentUser.userId,
      action: 'documents.generate_offer_letter',
      entity: 'employee_documents',
      entityId: createdDoc.id,
      newValue: {
        employee_id: employeeId,
        file_name: downloadName,
        designation,
        joiningDate,
        salary,
      },
      ip,
    });

    return createdDoc;
  }
}

export const documentsService = new DocumentsService();
