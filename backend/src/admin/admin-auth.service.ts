import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hashSync } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AppException } from '../common/errors/app.exception';
import { safeEqualHex, sha256 } from '../common/utils/hash';
import { Admin, RefreshToken } from '../schema';
import { AdminAccessService } from '../security/admin-access.service';
import { TokenService } from '../security/token.service';
import { AdminAuthResult, AdminProfile, AuthAdmin, SessionMeta } from '../types/auth.types';
import { AdminLoginDto } from './dto/admin.dto';

@Injectable()
export class AdminAuthService {
  private readonly dummyHash = hashSync('not-a-real-password', 10);

  constructor(
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @InjectRepository(RefreshToken) private readonly sessions: Repository<RefreshToken>,
    private readonly tokens: TokenService,
    private readonly access: AdminAccessService,
  ) {}

  async login(dto: AdminLoginDto, meta: SessionMeta): Promise<AdminAuthResult> {
    const admin = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.password')
      .innerJoinAndSelect('a.role', 'r')
      .where('a.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    const passwordOk = await compare(dto.password, admin?.password ?? this.dummyHash);
    if (!admin || !passwordOk) {
      throw AppException.unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');
    }
    if (!admin.isActive || !admin.role.isActive) {
      throw AppException.forbidden('ACCOUNT_DISABLED', 'This admin account has been deactivated.');
    }

    const sessionId = randomUUID();
    const refreshToken = await this.tokens.signAdminRefresh({ sub: admin.id, sid: sessionId });
    await this.sessions.insert({
      id: sessionId,
      adminId: admin.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs),
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
      ipAddress: meta.ipAddress?.slice(0, 50) ?? null,
    });

    const accessToken = await this.signAccess(admin, sessionId);
    return { accessToken, refreshToken, admin: await this.buildProfile(admin) };
  }

  async refresh(
    refreshToken: string | undefined,
  ): Promise<{ accessToken: string; admin: AdminProfile }> {
    if (!refreshToken) throw AppException.unauthorized('Refresh token missing', 'NO_REFRESH_TOKEN');

    let payload;
    try {
      payload = await this.tokens.verifyAdminRefresh(refreshToken);
    } catch {
      throw AppException.unauthorized('Refresh token is invalid or expired', 'REFRESH_INVALID');
    }

    const session = await this.sessions.findOne({
      where: { id: payload.sid, adminId: payload.sub, isRevoked: false },
      relations: { admin: { role: true } },
    });
    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      !safeEqualHex(session.tokenHash, sha256(refreshToken)) ||
      !session.admin.isActive ||
      !session.admin.role.isActive
    ) {
      throw AppException.unauthorized('Refresh token is invalid or expired', 'REFRESH_INVALID');
    }

    return {
      accessToken: await this.signAccess(session.admin, session.id),
      admin: await this.buildProfile(session.admin),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.tokens.verifyAdminRefresh(refreshToken);
      await this.sessions.update({ id: payload.sid, adminId: payload.sub }, { isRevoked: true });
    } catch {
      // Nothing left to revoke.
    }
  }

  /** Profile + effective per-resource permissions for the signed-in admin. */
  async me(auth: AuthAdmin): Promise<AdminProfile> {
    const admin = await this.admins.findOneOrFail({
      where: { id: auth.id },
      relations: { role: true },
    });
    return this.buildProfile(admin);
  }

  private signAccess(admin: Admin, sessionId: string): Promise<string> {
    return this.tokens.signAdminAccess({
      sub: admin.id,
      email: admin.email,
      roleId: admin.role.id,
      roleName: admin.role.name,
      sid: sessionId,
    });
  }

  private async buildProfile(admin: Admin): Promise<AdminProfile> {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role.name,
      roleId: admin.role.id,
      isSystem: admin.role.isSystem,
      permissions: await this.access.getMatrix(admin.role.id, admin.role.isSystem),
    };
  }
}
