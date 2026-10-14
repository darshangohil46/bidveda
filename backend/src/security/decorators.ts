import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionAction, UserRole } from '../types/enums';
import { AuthAdmin, AuthUser, RequestWithAdmin, RequestWithUser } from '../types/auth.types';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserJwtGuard } from './guards/user-jwt.guard';
import { RequiredPermission } from '../types/security.types';
import { PERMISSION_KEY, ROLES_KEY } from './keys';

/** Buyer / vendor endpoint: valid user token + one of the given roles. */
export function UserAuth(...roles: UserRole[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(UserJwtGuard, RolesGuard),
    ApiBearerAuth('user'),
  );
}

/** Admin endpoint: valid admin token + dynamic resource permission check. */
export function AdminAuth() {
  return applyDecorators(UseGuards(AdminJwtGuard, PermissionGuard), ApiBearerAuth('admin'));
}

/** Admin endpoint that is allowed for any signed-in admin (profile, metadata). */
export function AdminSession() {
  return applyDecorators(UseGuards(AdminJwtGuard), ApiBearerAuth('admin'));
}

/** Pin an admin route to one explicit permission instead of the `:resource` param. */
export const RequirePermission = (tableKey: string, action: PermissionAction) =>
  SetMetadata<string, RequiredPermission>(PERMISSION_KEY, { tableKey, action });

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<RequestWithUser>().user;
});

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthAdmin => {
  return ctx.switchToHttp().getRequest<RequestWithAdmin>().admin;
});
