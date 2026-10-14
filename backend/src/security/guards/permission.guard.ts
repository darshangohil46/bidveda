import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../common/errors/app.exception';
import { RequestWithAdmin } from '../../types/auth.types';
import { SUPER_ADMIN_ROLE } from '../../common/constants';
import { PermissionAction } from '../../types/enums';
import { AdminAccessService } from '../admin-access.service';
import { RequiredPermission } from '../../types/security.types';
import { PERMISSION_KEY } from '../keys';

const METHOD_TO_ACTION: Record<string, PermissionAction> = {
  GET: PermissionAction.READ,
  POST: PermissionAction.CREATE,
  PATCH: PermissionAction.UPDATE,
  PUT: PermissionAction.UPDATE,
  DELETE: PermissionAction.DELETE,
};

/**
 * Dynamic permission check (admin.txt section 7):
 * 1. Super Admin (system role) is always allowed.
 * 2. `@RequirePermission(table, action)` pins an explicit permission.
 * 3. Otherwise the `:resource` URL param + HTTP method decide the permission.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AdminAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const admin = req.admin;
    if (!admin) throw AppException.unauthorized();
    if (admin.isSystem || admin.roleName === SUPER_ADMIN_ROLE.name) return true;

    const explicit = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    let tableKey: string | undefined;
    let action: PermissionAction | undefined;
    if (explicit) {
      tableKey = explicit.tableKey;
      action = explicit.action;
    } else {
      const resource = (req.params as Record<string, string | undefined>).resource;
      if (resource) {
        tableKey = resource;
        action = METHOD_TO_ACTION[req.method];
      }
    }

    // No resource in the URL (profile, metadata, dashboard): any signed-in admin.
    if (!tableKey || !action) return true;

    const allowed = await this.access.hasPermission(admin.roleId, tableKey, action);
    if (!allowed) {
      throw AppException.forbidden(
        'FORBIDDEN_PERMISSION',
        `Your role cannot ${action} ${tableKey}.`,
      );
    }
    return true;
  }
}
