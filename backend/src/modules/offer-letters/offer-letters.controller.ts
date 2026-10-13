import { Request, Response, NextFunction } from 'express';
import { offerLettersService } from './offer-letters.service';
import {
  createTemplateSchema,
  updateTemplateSchema,
  generateOfferLetterSchema,
  declineOfferSchema,
  sendOfferSchema,
} from './offer-letters.schema';
import { BadRequestError, ForbiddenError } from '../../shared/errors/app-error';
import { TokenUserPayload } from '../../shared/utils/jwt.util';

export class OfferLettersController {
  // ==========================================
  // TEMPLATES
  // ==========================================
  async listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await offerLettersService.listTemplates();
      res.json({ success: true, data: templates });
    } catch (err) {
      next(err);
    }
  }

  async getTemplateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid template ID', [{ field: 'id', message: 'ID must be an integer' }]);
      }
      const template = await offerLettersService.getTemplateById(id);
      res.json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createTemplateSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(
          'Validation failed',
          parseResult.error.errors.map((e) => ({
            field: String(e.path[0]),
            message: e.message,
          }))
        );
      }
      const userId = (req as any).user?.userId ?? (req as any).user?.id ?? 1;
      const created = await offerLettersService.createTemplate(parseResult.data, userId);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid template ID', [{ field: 'id', message: 'ID must be an integer' }]);
      }
      const parseResult = updateTemplateSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(
          'Validation failed',
          parseResult.error.errors.map((e) => ({
            field: String(e.path[0]),
            message: e.message,
          }))
        );
      }
      const userId = (req as any).user?.userId ?? (req as any).user?.id ?? 1;
      const updated = await offerLettersService.updateTemplate(id, parseResult.data, userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async duplicateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid template ID', [{ field: 'id', message: 'ID must be an integer' }]);
      }
      const userId = (req as any).user?.userId ?? (req as any).user?.id ?? 1;
      const duplicated = await offerLettersService.duplicateTemplate(id, userId);
      res.status(201).json({ success: true, data: duplicated });
    } catch (err) {
      next(err);
    }
  }

  async setDefaultTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid template ID', [{ field: 'id', message: 'ID must be an integer' }]);
      }
      const userId = (req as any).user?.userId ?? (req as any).user?.id ?? 1;
      const updated = await offerLettersService.setDefaultTemplate(id, userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid template ID', [{ field: 'id', message: 'ID must be an integer' }]);
      }
      const userId = (req as any).user?.userId ?? (req as any).user?.id ?? 1;
      await offerLettersService.deleteTemplate(id, userId);
      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // OFFER LETTERS
  // ==========================================
  async listOfferLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = req.query.employee_id ? parseInt(String(req.query.employee_id), 10) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const letters = await offerLettersService.repository.listOfferLetters({
        employee_id: employeeId,
        status,
        search,
      });
      res.json({ success: true, data: letters });
    } catch (err) {
      next(err);
    }
  }

  async getEmployeeOfferLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId, 10);
      if (isNaN(employeeId)) {
        throw new BadRequestError('Invalid employee ID', [{ field: 'employeeId', message: 'Must be an integer' }]);
      }

      const currentUser = (req as any).user as TokenUserPayload;
      const isAdminOrHr =
        currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
        currentUser.permissions.includes('offer_letters.view') ||
        currentUser.permissions.includes('*');

      if (!isAdminOrHr && currentUser.employeeId !== employeeId) {
        throw new ForbiddenError('You do not have permission to view this employee offer letter');
      }

      const latest = await offerLettersService.repository.findLatestByEmployeeId(employeeId);
      const history = await offerLettersService.repository.findHistoryByEmployeeId(employeeId);
      res.json({ success: true, data: { latest, history } });
    } catch (err) {
      next(err);
    }
  }

  async getMyOfferLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user as TokenUserPayload;
      if (!user?.employeeId) {
        res.json({ success: true, data: null });
        return;
      }
      const letter = await offerLettersService.getMyOfferLetter(user.employeeId);
      res.json({ success: true, data: letter });
    } catch (err) {
      next(err);
    }
  }

  async getOfferLetterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid offer letter ID', [{ field: 'id', message: 'Must be an integer' }]);
      }
      const letter = await offerLettersService.repository.findOfferLetterById(id);
      if (!letter) {
        res.status(404).json({ success: false, message: 'Offer letter not found' });
        return;
      }

      const currentUser = (req as any).user as TokenUserPayload;
      const isAdminOrHr =
        currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
        currentUser.permissions.includes('offer_letters.view') ||
        currentUser.permissions.includes('*');

      if (!isAdminOrHr && currentUser.employeeId !== letter.employee_id) {
        throw new ForbiddenError('You do not have permission to view this offer letter');
      }

      res.json({ success: true, data: letter });
    } catch (err) {
      next(err);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = generateOfferLetterSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(
          'Validation failed',
          parseResult.error.errors.map((e) => ({
            field: String(e.path[0]),
            message: e.message,
          }))
        );
      }
      const currentUser = (req as any).user as TokenUserPayload;
      const letter = await offerLettersService.generateOfferLetter(
        parseResult.data,
        currentUser,
        req.ip
      );
      res.status(201).json({ success: true, data: letter });
    } catch (err) {
      next(err);
    }
  }

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid offer letter ID', [{ field: 'id', message: 'Must be an integer' }]);
      }
      const parseResult = sendOfferSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(
          'Validation failed',
          parseResult.error.errors.map((e) => ({
            field: String(e.path[0]),
            message: e.message,
          }))
        );
      }
      const currentUser = (req as any).user as TokenUserPayload;
      const letter = await offerLettersService.sendOfferLetter(
        id,
        currentUser,
        parseResult.data,
        req.ip
      );
      res.json({ success: true, data: letter });
    } catch (err) {
      next(err);
    }
  }

  async markAccepted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid offer letter ID', [{ field: 'id', message: 'Must be an integer' }]);
      }
      const currentUser = (req as any).user as TokenUserPayload;
      const letter = await offerLettersService.markAccepted(id, currentUser, req.ip);
      res.json({ success: true, data: letter });
    } catch (err) {
      next(err);
    }
  }

  async markDeclined(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid offer letter ID', [{ field: 'id', message: 'Must be an integer' }]);
      }
      const parseResult = declineOfferSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new BadRequestError(
          'Validation failed',
          parseResult.error.errors.map((e) => ({
            field: String(e.path[0]),
            message: e.message,
          }))
        );
      }
      const currentUser = (req as any).user as TokenUserPayload;
      const letter = await offerLettersService.markDeclined(
        id,
        parseResult.data.reason,
        currentUser,
        req.ip
      );
      res.json({ success: true, data: letter });
    } catch (err) {
      next(err);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid offer letter ID', [{ field: 'id', message: 'Must be an integer' }]);
      }
      const currentUser = (req as any).user as TokenUserPayload;
      const filePath = await offerLettersService.getPdfFilePath(id, currentUser);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Offer_Letter_${id}.pdf"`);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
}

export const offerLettersController = new OfferLettersController();
