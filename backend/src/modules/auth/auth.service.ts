import { authRepository } from './auth.repository';
import { comparePassword, hashPassword } from '../../shared/utils/password.util';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt.util';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '../../shared/errors/app-error';
import {
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from '../../shared/middleware/rate-limit.middleware';
import { auditService } from '../../shared/services/audit.service';
import { AuthTokens, UserAuthResponse } from './auth.types';
import { LoginInput, ChangePasswordInput } from './auth.schema';

export class AuthService {
  public async login(input: LoginInput, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const user = await authRepository.findByEmail(input.email);

    if (!user) {
      await recordFailedLoginAttempt(input.email);
      throw new BadRequestError('Invalid email or password', [
        { field: 'password', message: 'Invalid email or password combination' },
      ]);
    }

    const isMatch = await comparePassword(input.password, user.password_hash);
    if (!isMatch) {
      await recordFailedLoginAttempt(input.email);
      throw new BadRequestError('Invalid email or password', [
        { field: 'password', message: 'Invalid email or password combination' },
      ]);
    }

    const employee = await authRepository.getEmployeeByUserId(user.id);
    if (user.status !== 'active' || employee?.lifecycle_stage === 'relieved') {
      throw new BadRequestError('Account disabled, contact HR', [
        { field: 'email', message: 'Account disabled, contact HR' },
      ]);
    }

    // Login successful - reset failed attempts
    await resetLoginAttempts(input.email);
    await authRepository.updateLastLogin(user.id);

    const roles = await authRepository.getUserRoles(user.id);
    const permissions = await authRepository.getUserPermissions(user.id);

    const employeeId = employee ? Number(employee.id) : null;

    const accessToken = generateAccessToken({
      userId: Number(user.id),
      employeeId,
      roles,
      permissions,
    });

    const refreshToken = generateRefreshToken({ userId: Number(user.id) });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await authRepository.saveRefreshToken(Number(user.id), refreshToken, expiresAt);

    await auditService.record({
      userId: Number(user.id),
      action: 'auth.login',
      entity: 'users',
      entityId: user.id,
      ip,
      userAgent,
    });

    const userPayload: UserAuthResponse = {
      id: Number(user.id),
      email: user.email,
      status: user.status,
      must_change_password: Boolean(user.must_change_password),
      roles,
      permissions,
      employee: employee
        ? {
            id: Number(employee.id),
            employee_code: employee.employee_code,
            first_name: employee.first_name,
            last_name: employee.last_name,
            photo_url: employee.photo_url,
            department_id: employee.department_id ? Number(employee.department_id) : null,
            designation_id: employee.designation_id ? Number(employee.designation_id) : null,
          }
        : null,
    };

    return {
      accessToken,
      refreshToken,
      user: userPayload,
    };
  }

  public async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { userId: number };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenRecord = await authRepository.findRefreshToken(refreshToken);
    if (!tokenRecord) {
      throw new UnauthorizedError('Refresh token is invalid or has been revoked');
    }

    const user = await authRepository.findById(payload.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account not found or inactive');
    }

    // Rotate refresh token: revoke current token
    await authRepository.revokeRefreshToken(refreshToken);

    const roles = await authRepository.getUserRoles(user.id);
    const permissions = await authRepository.getUserPermissions(user.id);
    const employee = await authRepository.getEmployeeByUserId(user.id);

    const employeeId = employee ? Number(employee.id) : null;

    const newAccessToken = generateAccessToken({
      userId: Number(user.id),
      employeeId,
      roles,
      permissions,
    });

    const newRefreshToken = generateRefreshToken({ userId: Number(user.id) });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.saveRefreshToken(Number(user.id), newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await authRepository.revokeRefreshToken(refreshToken);
    }
  }

  public async changePassword(
    userId: number,
    input: ChangePasswordInput,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(input.oldPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect', [
        { field: 'oldPassword', message: 'Current password is incorrect' },
      ]);
    }

    const newHash = await hashPassword(input.newPassword);
    await authRepository.updatePassword(userId, newHash);
    await authRepository.revokeAllUserRefreshTokens(userId);

    await auditService.record({
      userId,
      action: 'auth.change_password',
      entity: 'users',
      entityId: userId,
      ip,
      userAgent,
    });
  }

  public async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    // Always succeed without leaking whether email exists
  }

  public async getCurrentUser(userId: number): Promise<UserAuthResponse> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const roles = await authRepository.getUserRoles(user.id);
    const permissions = await authRepository.getUserPermissions(user.id);
    const employee = await authRepository.getEmployeeByUserId(user.id);

    return {
      id: Number(user.id),
      email: user.email,
      status: user.status,
      must_change_password: Boolean(user.must_change_password),
      roles,
      permissions,
      employee: employee
        ? {
            id: Number(employee.id),
            employee_code: employee.employee_code,
            first_name: employee.first_name,
            last_name: employee.last_name,
            photo_url: employee.photo_url,
            department_id: employee.department_id ? Number(employee.department_id) : null,
            designation_id: employee.designation_id ? Number(employee.designation_id) : null,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
export default authService;
