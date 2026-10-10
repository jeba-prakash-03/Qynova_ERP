import { Request, Response } from 'express';
import { documentsService } from './documents.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { BadRequestError } from '../../shared/errors/app-error';
import { DocumentType } from './documents.types';

export class DocumentsController {
  upload = async (req: Request, res: Response) => {
    const employeeId = Number(req.params.id);
    if (!req.file) {
      throw new BadRequestError('File is required for upload (max 5 MB, pdf/jpg/png only)');
    }

    const type = req.body.type as DocumentType;
    if (!type) {
      throw new BadRequestError('Document type is required');
    }

    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const doc = await documentsService.uploadDocument(
      employeeId,
      req.file,
      type,
      req.user!,
      ip
    );

    return sendCreated(res, doc, 'Document uploaded successfully');
  };

  listByEmployee = async (req: Request, res: Response) => {
    const employeeId = Number(req.params.id);
    const docs = await documentsService.getEmployeeDocuments(employeeId, req.user!);
    return sendSuccess(res, docs);
  };

  download = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const doc = await documentsService.getDocumentForDownload(id, req.user!);
    return res.download(doc.file_path, doc.file_name);
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await documentsService.deleteDocument(id, req.user!, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Document deleted successfully');
  };

  generateOfferLetter = async (req: Request, res: Response) => {
    const employeeId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const doc = await documentsService.generateOfferLetter(
      employeeId,
      req.user!,
      req.body,
      ip
    );
    return sendCreated(res, doc, 'Offer letter generated successfully');
  };
}

export const documentsController = new DocumentsController();
