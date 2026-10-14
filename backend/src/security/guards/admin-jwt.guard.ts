import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { RefreshToken } from '../../schema';
import { RequestWithAdmin } from '../../types/auth.types';
import { TokenService } from '../token.service';
import { extractBearer } from './user-jwt.guard';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    @InjectRepository(RefreshToken)
    private readonly sessions: Repository<RefreshToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const token = extractBearer(req);
    if (!token) throw AppException.unauthorized();

    let payload;
    try {
      payload = await this.tokens.verifyAdminAccess(token);
    } catch {
      throw AppException.unauthorized('Access token is invalid or expired', 'TOKEN_EXPIRED');
    }

    const session = await this.sessions.findOne({
      where: { id: payload.sid, adminId: payload.sub, isRevoked: false },
      relations: { admin: { role: true } },
    });
    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.admin.isActive ||
      !session.admin.role.isActive
    ) {
      throw AppException.unauthorized('Session has ended', 'SESSION_ENDED');
    }

    req.admin = {
      id: session.admin.id,
      name: session.admin.name,
      email: session.admin.email,
      roleId: session.admin.role.id,
      roleName: session.admin.role.name,
      isSystem: session.admin.role.isSystem,
      sessionId: session.id,
    };
    return true;
  }
}
