import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { UserRefreshToken } from '../../schema';
import { RequestWithUser } from '../../types/auth.types';
import { TokenService } from '../token.service';

export function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Verifies the access token AND that its session is still live. A logged-out or
 * deactivated user is rejected immediately instead of waiting for the token to expire.
 */
@Injectable()
export class UserJwtGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    @InjectRepository(UserRefreshToken)
    private readonly sessions: Repository<UserRefreshToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearer(req);
    if (!token) throw AppException.unauthorized();

    let payload;
    try {
      payload = await this.tokens.verifyUserAccess(token);
    } catch {
      throw AppException.unauthorized('Access token is invalid or expired', 'TOKEN_EXPIRED');
    }

    const session = await this.sessions.findOne({
      where: { id: payload.sid, userId: payload.sub, isRevoked: false },
      relations: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      throw AppException.unauthorized('Session has ended', 'SESSION_ENDED');
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    };
    return true;
  }
}
