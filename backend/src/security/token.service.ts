import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JWT_AUDIENCE_ADMIN, JWT_AUDIENCE_USER } from '../common/constants';
import { JwtAdminPayload, JwtRefreshPayload, JwtUserPayload } from '../types/auth.types';
import { EnvVars } from '../types/env.types';

/**
 * Signs and verifies all JWTs. Buyer/vendor and admin tokens use different
 * audiences, so a token from one realm can never be accepted by the other.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  get refreshTtlMs(): number {
    return this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
  }

  private get accessTtlSeconds(): number {
    return this.config.get('ACCESS_TOKEN_TTL_MINUTES', { infer: true }) * 60;
  }

  private get refreshTtlSeconds(): number {
    return Math.floor(this.refreshTtlMs / 1000);
  }

  private get accessSecret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  private get refreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  // ------------------------------------------------------------ buyer / vendor
  signUserAccess(payload: JwtUserPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload },
      { secret: this.accessSecret, expiresIn: this.accessTtlSeconds, audience: JWT_AUDIENCE_USER },
    );
  }

  signUserRefresh(payload: JwtRefreshPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtlSeconds,
        audience: JWT_AUDIENCE_USER,
      },
    );
  }

  verifyUserAccess(token: string): Promise<JwtUserPayload> {
    return this.jwt.verifyAsync<JwtUserPayload>(token, {
      secret: this.accessSecret,
      audience: JWT_AUDIENCE_USER,
    });
  }

  verifyUserRefresh(token: string): Promise<JwtRefreshPayload> {
    return this.jwt.verifyAsync<JwtRefreshPayload>(token, {
      secret: this.refreshSecret,
      audience: JWT_AUDIENCE_USER,
    });
  }

  // --------------------------------------------------------------------- admin
  signAdminAccess(payload: JwtAdminPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload },
      { secret: this.accessSecret, expiresIn: this.accessTtlSeconds, audience: JWT_AUDIENCE_ADMIN },
    );
  }

  signAdminRefresh(payload: JwtRefreshPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtlSeconds,
        audience: JWT_AUDIENCE_ADMIN,
      },
    );
  }

  verifyAdminAccess(token: string): Promise<JwtAdminPayload> {
    return this.jwt.verifyAsync<JwtAdminPayload>(token, {
      secret: this.accessSecret,
      audience: JWT_AUDIENCE_ADMIN,
    });
  }

  verifyAdminRefresh(token: string): Promise<JwtRefreshPayload> {
    return this.jwt.verifyAsync<JwtRefreshPayload>(token, {
      secret: this.refreshSecret,
      audience: JWT_AUDIENCE_ADMIN,
    });
  }
}
