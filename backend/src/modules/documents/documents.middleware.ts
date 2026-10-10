import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BadRequestError } from '../../shared/errors/app-error';

// Storage directory outside public web root
export const DOCUMENTS_STORAGE_DIR = path.resolve(__dirname, '../../../storage/documents');

// Ensure directory exists
if (!fs.existsSync(DOCUMENTS_STORAGE_DIR)) {
  fs.mkdirSync(DOCUMENTS_STORAGE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, DOCUMENTS_STORAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${crypto.randomUUID()}${ext}`;
    cb(null, randomName);
  },
});

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export const uploadDocumentMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestError(
          'Invalid file type. Only PDF, JPG, and PNG files under 5 MB are allowed.'
        )
      );
    }
    cb(null, true);
  },
});
