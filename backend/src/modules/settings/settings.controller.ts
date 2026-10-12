import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { settingsService } from './settings.service';
import { BRANDING_STORAGE_DIR } from './settings.middleware';
import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';

export class SettingsController {
  public async getCompanySettings(_req: Request, res: Response) {
    const settings = await settingsService.getCompanySettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  }

  public async updateCompanySettings(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const updated = await settingsService.updateCompanySettings(
      req.body,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Company settings updated successfully',
      data: updated,
    });
  }

  public async uploadLogo(req: Request, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No logo file provided', [
        { field: 'logo', message: 'Logo file is required' },
      ]);
    }
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await settingsService.updateLogo(
      req.file.filename,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Company logo uploaded successfully',
      data: result,
    });
  }

  public async deleteLogo(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    await settingsService.deleteLogo(userId, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Company logo removed successfully',
    });
  }

  public async uploadFavicon(req: Request, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No favicon file provided', [
        { field: 'favicon', message: 'Favicon file is required' },
      ]);
    }
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await settingsService.updateFavicon(
      req.file.filename,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: result,
    });
  }

  public async deleteFavicon(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    await settingsService.deleteFavicon(userId, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Favicon removed successfully',
    });
  }

  public async uploadSignature(req: Request, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No signature file provided', [
        { field: 'signature', message: 'Signature file is required' },
      ]);
    }
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await settingsService.updateSignature(
      req.file.filename,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Signature image uploaded successfully',
      data: result,
    });
  }

  public async deleteSignature(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    await settingsService.deleteSignature(userId, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Signature image removed successfully',
    });
  }

  public async getPublicBranding(_req: Request, res: Response) {
    const branding = await settingsService.getPublicBranding();
    res.status(200).json({
      success: true,
      data: branding,
    });
  }

  public async serveBrandingFile(req: Request, res: Response) {
    const { filename } = req.params;
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(BRANDING_STORAGE_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Branding file not found');
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
    fs.createReadStream(filePath).pipe(res);
  }

  public async getWorkSettings(_req: Request, res: Response) {
    const work = await settingsService.getWorkSettings();
    res.status(200).json({
      success: true,
      data: work,
    });
  }

  public async updateWorkSettings(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const updated = await settingsService.updateWorkSettings(
      req.body,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Work and attendance settings updated successfully',
      data: updated,
    });
  }

  public async getLeavePolicy(_req: Request, res: Response) {
    const policy = await settingsService.getLeavePolicy();
    res.status(200).json({
      success: true,
      data: policy,
    });
  }

  public async updateLeavePolicy(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const updated = await settingsService.updateLeavePolicy(
      req.body,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Leave policy updated successfully',
      data: updated,
    });
  }

  public async getPayrollSettings(_req: Request, res: Response) {
    const payroll = await settingsService.getPayrollSettings();
    res.status(200).json({
      success: true,
      data: payroll,
    });
  }

  public async updatePayrollSettings(req: Request, res: Response) {
    const userId = (req as any).user?.userId ?? (req as any).user?.id ?? null;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const updated = await settingsService.updatePayrollSettings(
      req.body,
      userId,
      ip,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Payroll settings updated successfully',
      data: updated,
    });
  }
}

export const settingsController = new SettingsController();
