import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, hashSync, compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AppException } from '../common/errors/app.exception';
import { safeEqualHex, sha256 } from '../common/utils/hash';
import { MailService } from '../mail/mail.service';
import { TokenService } from '../security/token.service';
import { User, UserRefreshToken } from '../schema';
import {
  AuthUser,
  PublicUser,
  SessionMeta,
  SessionView,
  UserAuthResult,
} from '../types/auth.types';
import { EnvVars } from '../types/env.types';
import { LoginDto, SignupDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  /** Compared against when the email is unknown, so response time does not reveal which emails exist. */
  private readonly dummyHash = hashSync('not-a-real-password', 10);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserRefreshToken) private readonly sessions: Repository<UserRefreshToken>,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  async signup(dto: SignupDto, meta: SessionMeta): Promise<UserAuthResult> {
    const email = dto.email.toLowerCase();
    if (await this.users.exists({ where: { email } })) {
      throw AppException.conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    }

    const user = await this.users.save(
      this.users.create({
        name: dto.name,
        email,
        password: await hash(dto.password, this.config.get('BCRYPT_ROUNDS', { infer: true })),
        role: dto.role,
        companyName: dto.companyName,
        phone: dto.phone ?? null,
        isActive: true,
      }),
    );

    this.mail.sendWelcome(user.email, { name: user.name, role: user.role });
    return this.startSession(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<UserAuthResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    const passwordOk = await compare(dto.password, user?.password ?? this.dummyHash);
    if (!user || !passwordOk) {
      throw AppException.unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');
    }
    if (!user.isActive) {
      throw AppException.forbidden('ACCOUNT_DISABLED', 'This account has been deactivated.');
    }
    return this.startSession(user, meta);
  }

  /** Exchanges a valid refresh token for a new access token. The refresh token is not rotated. */
  async refresh(
    refreshToken: string | undefined,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const session = await this.findLiveSession(refreshToken);
    const { user } = session;
    if (!user.isActive) {
      throw AppException.unauthorized('Session has ended', 'SESSION_ENDED');
    }

    await this.sessions.update(session.id, { lastUsedAt: new Date() });
    const accessToken = await this.tokens.signUserAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: session.id,
    });
    return { accessToken, user: this.toPublic(user) };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.tokens.verifyUserRefresh(refreshToken);
      await this.sessions.update({ id: payload.sid, userId: payload.sub }, { isRevoked: true });
    } catch {
      // An invalid or expired token has nothing left to revoke.
    }
  }

  async logoutAll(user: AuthUser): Promise<void> {
    await this.sessions.update({ userId: user.id, isRevoked: false }, { isRevoked: true });
  }

  async me(user: AuthUser): Promise<PublicUser> {
    const row = await this.users.findOneByOrFail({ id: user.id });
    return this.toPublic(row);
  }

  async listSessions(user: AuthUser): Promise<SessionView[]> {
    const rows = await this.sessions
      .createQueryBuilder('s')
      .where('s.userId = :userId AND s.isRevoked = false AND s.expiresAt > now()', {
        userId: user.id,
      })
      .orderBy('s.createdAt', 'DESC')
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      userAgent: row.userAgent,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      isCurrent: row.id === user.sessionId,
    }));
  }

  async revokeSession(user: AuthUser, sessionId: string): Promise<void> {
    const result = await this.sessions.update(
      { id: sessionId, userId: user.id, isRevoked: false },
      { isRevoked: true },
    );
    if (!result.affected) throw AppException.notFound('Session not found');
  }

  // ------------------------------------------------------------------ helpers
  private async startSession(user: User, meta: SessionMeta): Promise<UserAuthResult> {
    const sessionId = randomUUID();
    const refreshToken = await this.tokens.signUserRefresh({ sub: user.id, sid: sessionId });

    await this.sessions.insert({
      id: sessionId,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs),
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
      ipAddress: meta.ipAddress?.slice(0, 50) ?? null,
    });

    const accessToken = await this.tokens.signUserAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    });
    return { accessToken, refreshToken, user: this.toPublic(user) };
  }

  private async findLiveSession(refreshToken: string | undefined): Promise<UserRefreshToken> {
    if (!refreshToken) throw AppException.unauthorized('Refresh token missing', 'NO_REFRESH_TOKEN');

    let payload;
    try {
      payload = await this.tokens.verifyUserRefresh(refreshToken);
    } catch {
      throw AppException.unauthorized('Refresh token is invalid or expired', 'REFRESH_INVALID');
    }

    const session = await this.sessions.findOne({
      where: { id: payload.sid, userId: payload.sub, isRevoked: false },
      relations: { user: true },
    });
    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      !safeEqualHex(session.tokenHash, sha256(refreshToken))
    ) {
      throw AppException.unauthorized('Refresh token is invalid or expired', 'REFRESH_INVALID');
    }
    return session;
  }

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      phone: user.phone,
    };
  }
}
