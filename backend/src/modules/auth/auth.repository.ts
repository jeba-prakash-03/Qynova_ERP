import db from '../../db/knex';
import { UserRecord } from './auth.types';

export class AuthRepository {
  public async findByEmail(email: string): Promise<UserRecord | undefined> {
    return db('users')
      .where({ email: email.toLowerCase().trim() })
      .whereNull('deleted_at')
      .first();
  }

  public async findById(id: number): Promise<UserRecord | undefined> {
    return db('users').where({ id }).whereNull('deleted_at').first();
  }

  public async updateLastLogin(id: number): Promise<void> {
    await db('users').where({ id }).update({
      last_login_at: db.fn.now(),
    });
  }

  public async updatePassword(id: number, passwordHash: string): Promise<void> {
    await db('users').where({ id }).update({
      password_hash: passwordHash,
      must_change_password: false,
    });
  }

  public async getUserRoles(userId: number): Promise<string[]> {
    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .select('roles.name');
    return roles.map((r) => r.name);
  }

  public async getUserPermissions(userId: number): Promise<string[]> {
    // If user has Admin role, they get all permissions
    const roles = await this.getUserRoles(userId);
    if (roles.includes('Admin')) {
      const allPerms = await db('permissions').select('name');
      return allPerms.map((p) => p.name);
    }

    const perms = await db('user_roles')
      .join('role_permissions', 'user_roles.role_id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('user_roles.user_id', userId)
      .distinct('permissions.name');
    return perms.map((p) => p.name);
  }

  public async getEmployeeByUserId(userId: number): Promise<any | null> {
    const emp = await db('employees')
      .where({ user_id: userId })
      .whereNull('deleted_at')
      .first();
    return emp || null;
  }

  public async saveRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db('refresh_tokens').insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
      revoked: false,
    });
  }

  public async findRefreshToken(token: string): Promise<any | undefined> {
    return db('refresh_tokens')
      .where({ token, revoked: false })
      .andWhere('expires_at', '>', db.fn.now())
      .first();
  }

  public async revokeRefreshToken(token: string): Promise<void> {
    await db('refresh_tokens').where({ token }).update({ revoked: true });
  }

  public async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await db('refresh_tokens').where({ user_id: userId }).update({ revoked: true });
  }
}

export const authRepository = new AuthRepository();
export default authRepository;
