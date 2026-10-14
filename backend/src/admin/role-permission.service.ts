import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Permission, RolePermission } from '../schema';
import { PermissionFlags } from '../types/admin.types';
import { PermissionAction } from '../types/enums';
import { getAllResources } from './admin-resource.registry';

const ACTIONS = [
  PermissionAction.CREATE,
  PermissionAction.READ,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
];

/** Writes a role's permission matrix (resources x create/read/update/delete). */
@Injectable()
export class RolePermissionService {
  constructor(private readonly dataSource: DataSource) {}

  async apply(roleId: string, matrix: Record<string, Partial<PermissionFlags>>): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const permissions = await manager.find(Permission);
      const byKey = new Map(permissions.map((p) => [`${p.tableKey}:${p.action}`, p]));
      const existing = await manager.find(RolePermission, { where: { roleId } });
      const byPermission = new Map(existing.map((row) => [row.permissionId, row]));

      for (const resource of getAllResources()) {
        const requested = matrix[resource.key];
        if (!requested) continue;

        const flags: PermissionFlags = {
          create: resource.capabilities.create && requested.create === true,
          update: resource.capabilities.update && requested.update === true,
          delete: resource.capabilities.delete && requested.delete === true,
          read: requested.read === true,
        };
        // Writing to something you cannot read makes no sense, so reading is implied.
        if (flags.create || flags.update || flags.delete) flags.read = true;

        for (const action of ACTIONS) {
          const permission = byKey.get(`${resource.key}:${action}`);
          if (!permission) continue;
          const row = byPermission.get(permission.id);
          if (!row) {
            await manager.insert(RolePermission, {
              roleId,
              permissionId: permission.id,
              isGranted: flags[action],
            });
          } else if (row.isGranted !== flags[action]) {
            await manager.update(RolePermission, row.id, { isGranted: flags[action] });
          }
        }
      }
    });
  }
}
