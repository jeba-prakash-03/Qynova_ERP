import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../shared/errors/app-error';

// Storage directory outside public web root
export const DOCUMENTS_STORAGE_DIR = path.resolve(__dirname, '../../../storage/documents');

// Ensure directory exists
if (!fs.existsSync(DOCUMENTS_STORAGE_DIR)) {
  fs.mkdirSync(DOCUMENTS_STORAGE_DIR, { recursive: true });
}

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

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

const baseMulter = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new BadRequestError(
          'Invalid file type. Only PDF, JPG, and PNG files under 5 MB are allowed.'
        )
      );
    }
    cb(null, true);
  },
});

export async function verifyMagicBytes(file: Express.Multer.File): Promise<void> {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw new BadRequestError('Invalid file extension. Only .pdf, .jpg, .jpeg, and .png are allowed.');
  }

  const buffer = Buffer.alloc(8);
  const fd = await fs.promises.open(file.path, 'r');
  const { bytesRead } = await fd.read(buffer, 0, 8, 0);
  await fd.close();

  if (bytesRead < 3) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw new BadRequestError('Uploaded file is corrupted or empty');
  }

  const isPdf = buffer.slice(0, 4).toString('ascii') === '%PDF';
  const isPng =
    bytesRead >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  let verifiedMime: string | null = null;
  if (isPdf && ext === '.pdf') {
    verifiedMime = 'application/pdf';
  } else if (isPng && ext === '.png') {
    verifiedMime = 'image/png';
  } else if (isJpg && (ext === '.jpg' || ext === '.jpeg')) {
    verifiedMime = 'image/jpeg';
  }

  if (!verifiedMime) {
    await fs.promises.unlink(file.path).catch(() => {});
    throw new BadRequestError(
      'Invalid file format. File content does not match allowed magic bytes for .pdf, .jpg, or .png.'
    );
  }

  // Override client-provided MIME type with verified server MIME type
  file.mimetype = verifiedMime;
}

export const uploadDocumentMiddleware = {
  single: (fieldName: string) => {
    const singleHandler = baseMulter.single(fieldName);
    return (req: Request, res: Response, next: NextFunction) => {
      singleHandler(req, res, async (err) => {
        if (err) {
          return next(err);
        }
        if (req.file) {
          try {
            await verifyMagicBytes(req.file);
          } catch (magicErr) {
            return next(magicErr);
          }
        }
        next();
      });
    };
  },
};
