import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { SessionMeta } from '../types/auth.types';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminRefreshDto } from './dto/admin.dto';

function sessionMeta(req: Request): SessionMeta {
  const agent = req.headers['user-agent'];
  return { userAgent: typeof agent === 'string' ? agent : null, ipAddress: req.ip ?? null };
}

/** Admin sign-in lives under /auth/admin/* so every login route shares the /auth namespace. */
@ApiTags('Auth (admin)')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Admin sign-in' })
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.auth.login(dto, sessionMeta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'New access token from a refresh token' })
  refresh(@Body() dto: AdminRefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the admin session' })
  async logout(@Body() dto: AdminRefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
