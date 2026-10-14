import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../common/errors/app.exception';
import { RequestWithUser } from '../../types/auth.types';
import { UserRole } from '../../types/enums';
import { ROLES_KEY } from '../keys';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user || !roles.includes(user.role)) {
      throw AppException.forbidden('FORBIDDEN_ROLE', 'Your role is not allowed to do this.');
    }
    return true;
  }
}
