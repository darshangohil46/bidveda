import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { getAllResources } from '../admin/admin-resource.registry';
import { SUPER_ADMIN_ROLE } from '../common/constants';
import { Admin, AdminRole, Permission, RolePermission } from '../schema';
import { PermissionAction } from '../types/enums';
import { EnvVars } from '../types/env.types';

const ACTIONS = [
  PermissionAction.CREATE,
  PermissionAction.READ,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
];

/**
 * Runs on every boot (admin.txt section 3):
 *  1. make sure the Super Admin role exists
 *  2. make sure every registered resource has its 4 CRUD permissions
 *  3. grant all of them to Super Admin
 *  4. make sure the Super Admin account from .env exists
 * It is idempotent, so adding a table to the registry is enough: restart and it is wired up.
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Bootstrap');

  constructor(
    @InjectRepository(AdminRole) private readonly roles: Repository<AdminRole>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermissions: Repository<RolePermission>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const role = await this.ensureSuperAdminRole();
    await this.syncPermissions();
    await this.grantAllToSuperAdmin(role.id);
    await this.ensureSuperAdminUser(role.id);
  }

  private async ensureSuperAdminRole(): Promise<AdminRole> {
    const existing = await this.roles.findOneBy({ slug: SUPER_ADMIN_ROLE.slug });
    if (existing) {
      if (!existing.isSystem || !existing.isActive) {
        await this.roles.update(existing.id, { isSystem: true, isActive: true });
      }
      return existing;
    }
    this.logger.log('Creating the Super Admin role');
    return this.roles.save(
      this.roles.create({
        name: SUPER_ADMIN_ROLE.name,
        slug: SUPER_ADMIN_ROLE.slug,
        description: SUPER_ADMIN_ROLE.description,
        isSystem: true,
        isActive: true,
      }),
    );
  }

  private async syncPermissions(): Promise<void> {
    const existing = await this.permissions.find();
    const have = new Set(existing.map((p) => `${p.tableKey}:${p.action}`));

    const missing: Partial<Permission>[] = [];
    for (const resource of getAllResources()) {
      for (const action of ACTIONS) {
        if (!have.has(`${resource.key}:${action}`)) {
          missing.push({
            tableKey: resource.key,
            action,
            label: `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource.labelPlural}`,
          });
        }
      }
    }
    if (missing.length > 0) {
      await this.permissions.createQueryBuilder().insert().values(missing).orIgnore().execute();
      this.logger.log(`Added ${missing.length} permission(s) for new resources`);
    }
  }

  private async grantAllToSuperAdmin(roleId: string): Promise<void> {
    const [all, granted] = await Promise.all([
      this.permissions.find(),
      this.rolePermissions.find({ where: { roleId } }),
    ]);
    const byPermission = new Map(granted.map((row) => [row.permissionId, row]));

    const missing = all
      .filter((permission) => !byPermission.has(permission.id))
      .map((permission) => ({ roleId, permissionId: permission.id, isGranted: true }));
    if (missing.length > 0) {
      await this.rolePermissions.createQueryBuilder().insert().values(missing).orIgnore().execute();
    }
    for (const row of granted.filter((item) => !item.isGranted)) {
      await this.rolePermissions.update(row.id, { isGranted: true });
    }
  }

  private async ensureSuperAdminUser(roleId: string): Promise<void> {
    const email = this.config.get('SUPER_ADMIN_EMAIL', { infer: true }).trim().toLowerCase();
    const password = this.config.get('SUPER_ADMIN_PASSWORD', { infer: true });
    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });

    const existing = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.password')
      .where('a.email = :email', { email })
      .getOne();

    if (!existing) {
      await this.admins.save(
        this.admins.create({
          name: this.config.get('SUPER_ADMIN_NAME', { infer: true }),
          email,
          password: await hash(password, rounds),
          roleId,
          isActive: true,
        }),
      );
      this.logger.log(`Created Super Admin ${email}`);
      return;
    }

    const patch: Partial<Admin> = {};
    if (existing.roleId !== roleId) patch.roleId = roleId;
    if (!existing.isActive) patch.isActive = true;
    if (!(await compare(password, existing.password)))
      patch.password = await hash(password, rounds);
    if (Object.keys(patch).length > 0) {
      await this.admins.update(existing.id, patch);
      this.logger.log(`Synced Super Admin ${email} with .env`);
    }
  }
}
