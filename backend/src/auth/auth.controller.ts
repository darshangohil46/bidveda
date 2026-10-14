import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser, UserAuth } from '../security/decorators';
import { AuthUser, SessionMeta } from '../types/auth.types';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, SignupDto } from './dto/auth.dto';

function sessionMeta(req: Request): SessionMeta {
  const agent = req.headers['user-agent'];
  return { userAgent: typeof agent === 'string' ? agent : null, ipAddress: req.ip ?? null };
}

@ApiTags('Auth (buyer / vendor)')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a buyer or vendor account and sign in' })
  signup(@Body() dto: SignupDto, @Req() req: Request) {
    return this.auth.signup(dto, sessionMeta(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in; creates a new device session' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, sessionMeta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the session behind a refresh token' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @UserAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out of every device' })
  async logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logoutAll(user);
  }

  @Get('me')
  @UserAuth()
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @Get('sessions')
  @UserAuth()
  @ApiOperation({ summary: 'Devices currently signed in' })
  sessions(@CurrentUser() user: AuthUser) {
    return this.auth.listSessions(user);
  }

  @Delete('sessions/:id')
  @UserAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign one device out' })
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.auth.revokeSession(user, id);
  }
}
