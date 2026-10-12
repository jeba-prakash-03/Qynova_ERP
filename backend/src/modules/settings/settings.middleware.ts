import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../shared/errors/app-error';

// Storage directory under UPLOAD_DIR/branding
export const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'storage');

export const BRANDING_STORAGE_DIR = path.join(UPLOAD_BASE_DIR, 'branding');

if (!fs.existsSync(BRANDING_STORAGE_DIR)) {
  fs.mkdirSync(BRANDING_STORAGE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, BRANDING_STORAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${crypto.randomUUID()}${ext}`;
    cb(null, randomName);
  },
});

const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
const allowedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new BadRequestError(
        'Invalid file type. Only PNG, JPG, SVG, and WebP images are allowed.',
        [{ field: file.fieldname, message: 'Invalid file format' }]
      )
    );
  }
  cb(null, true);
};

export const uploadLogoMulter = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB max
  fileFilter,
}).single('logo');

export const uploadFaviconMulter = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB max
  fileFilter,
}).single('favicon');

export const uploadSignatureMulter = multer({
  storage,
  limits: { fileSize: 500 * 1024 }, // 500 KB max
  fileFilter,
}).single('signature');

/**
 * Validates real magic numbers / mime signatures of the uploaded file on disk.
 * Deletes file and returns 400 if forged.
 */
export const validateImageBuffer = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    return next(
      new BadRequestError('No image file uploaded', [
        { field: 'file', message: 'File is required' },
      ])
    );
  }

  const filePath = req.file.path;
  try {
    const buffer = fs.readFileSync(filePath);

    // PNG check
    const isPng =
      buffer.length > 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;

    // JPEG check
    const isJpeg =
      buffer.length > 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    // WebP check
    const isWebp =
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    // SVG check
    const textSnippet = buffer.subarray(0, 500).toString('utf8').trim();
    const isSvg =
      textSnippet.includes('<svg') ||
      (textSnippet.startsWith('<?xml') && textSnippet.includes('<svg'));

    if (!isPng && !isJpeg && !isWebp && !isSvg) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return next(
        new BadRequestError('File content does not match genuine image data', [
          { field: req.file.fieldname, message: 'Invalid magic bytes or corrupted image' },
        ])
      );
    }

    next();
  } catch (err: any) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    next(
      new BadRequestError(`Failed to process uploaded image: ${err.message}`, [
        { field: req.file.fieldname, message: err.message },
      ])
    );
  }
};
