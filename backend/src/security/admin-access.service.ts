import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../schema';
import { PermissionAction } from '../types/enums';
import { PermissionMatrix } from '../types/admin.types';
import { getAllResources } from '../admin/admin-resource.registry';

const ACTIONS = [
  PermissionAction.CREATE,
  PermissionAction.READ,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
];

/** Resolves what a role may do. Granted rows are intersected with each resource's capabilities. */
@Injectable()
export class AdminAccessService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissions: Repository<RolePermission>,
  ) {}

  async hasPermission(
    roleId: string,
    tableKey: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const granted = await this.rolePermissions.count({
      where: { roleId, isGranted: true, permission: { tableKey, action } },
    });
    return granted > 0;
  }

  /** Full matrix for one role: every registered resource x every action. */
  async getMatrix(roleId: string, isSystem: boolean): Promise<PermissionMatrix> {
    const granted = new Set<string>();
    if (!isSystem) {
      const rows = await this.rolePermissions.find({
        where: { roleId, isGranted: true },
        relations: { permission: true },
      });
      rows.forEach((row) => granted.add(`${row.permission.tableKey}:${row.permission.action}`));
    }

    const matrix: PermissionMatrix = {};
    for (const resource of getAllResources()) {
      const flags = { create: false, read: false, update: false, delete: false };
      for (const action of ACTIONS) {
        const capable =
          action === PermissionAction.READ ||
          resource.capabilities[action as 'create' | 'update' | 'delete'];
        flags[action] = capable && (isSystem || granted.has(`${resource.key}:${action}`));
      }
      matrix[resource.key] = flags;
    }
    return matrix;
  }
}
