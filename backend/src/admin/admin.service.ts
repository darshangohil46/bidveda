import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { Brackets, DataSource, ObjectLiteral, Repository } from 'typeorm';
import { STORED_IMAGE_NAME } from '../common/constants';
import { AppException } from '../common/errors/app.exception';
import { escapeLike, toPage } from '../common/utils/pagination';
import { Admin, AdminRole } from '../schema';
import { AdminAccessService } from '../security/admin-access.service';
import { FileStorageService } from '../storage/file-storage.service';
import {
  AdminRow as Row,
  AdminWriteMode as Mode,
  CoercedValue as Coerced,
  FieldMeta,
  FieldType,
  OptionItem,
  PermissionFlags,
  RegistryEntry,
  ResourceMeta,
} from '../types/admin.types';
import { AuthAdmin } from '../types/auth.types';
import { Paginated } from '../types/common.types';
import { AuditAction, PermissionAction, ResourceKey, SortOrder } from '../types/enums';
import { EnvVars } from '../types/env.types';
import { AdminAuditService } from './admin-audit.service';
import { getAllResources, getResource } from './admin-resource.registry';
import { AdminListQueryDto, AdminOptionsQueryDto } from './dto/admin.dto';
import { RolePermissionService } from './role-permission.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNSORTABLE = new Set<FieldType>([
  FieldType.FK,
  FieldType.PASSWORD,
  FieldType.JSON,
  FieldType.ARRAY,
]);

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * Generic CRUD for every table in the registry (admin.txt sections 5-6). Nothing here
 * knows about a specific table except a few guarded hooks for admins and roles.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AdminAuditService,
    private readonly access: AdminAccessService,
    private readonly matrices: RolePermissionService,
    private readonly config: ConfigService<EnvVars, true>,
    private readonly storage: FileStorageService,
  ) {}

  // ------------------------------------------------------------------ metadata
  /** Public registry metadata; nullability is read from the TypeORM entity, not hand-written. */
  getResources(): ResourceMeta[] {
    return getAllResources().map(({ entityMarker, ...meta }) => {
      const metadata = this.dataSource.getMetadata(entityMarker);
      const fields = meta.fields.map((field) => {
        const column = metadata.findColumnWithPropertyName(field.name);
        const relation = metadata.findRelationWithPropertyPath(field.name);
        return {
          ...field,
          nullable: field.nullable ?? column?.isNullable ?? relation?.isNullable ?? false,
        };
      });
      return { ...meta, fields };
    });
  }

  async dashboardCounts(admin: AuthAdmin): Promise<Record<string, number>> {
    const matrix = await this.access.getMatrix(admin.roleId, admin.isSystem);
    const readable = getAllResources().filter((resource) => matrix[resource.key]?.read);
    const counts = await Promise.all(
      readable.map(
        async (resource) => [resource.key, await this.repoOf(resource).count()] as const,
      ),
    );
    return Object.fromEntries(counts);
  }

  // ---------------------------------------------------------------------- read
  async list(key: string, query: AdminListQueryDto): Promise<Paginated<Row>> {
    const meta = this.entry(key);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.repoOf(meta).createQueryBuilder('e');
    this.joinForeignKeys(qb, meta);

    const term = query.search?.trim();
    const searchable = meta.fields.filter(
      (field) => field.searchable && field.type !== FieldType.FK,
    );
    if (term && searchable.length > 0) {
      qb.andWhere(
        new Brackets((where) => {
          for (const field of searchable) {
            where.orWhere(`CAST(e.${field.name} AS text) ILIKE :term`, {
              term: `%${escapeLike(term)}%`,
            });
          }
        }),
      );
    }

    // Only declared, non-secret columns may be sorted on, so sortBy can never inject SQL.
    const sortable = new Set(
      meta.fields
        .filter((field) => !field.secret && !UNSORTABLE.has(field.type))
        .map((field) => field.name),
    );
    const defaultSort = sortable.has('createdAt') ? 'createdAt' : 'id';
    const sortBy = query.sortBy && sortable.has(query.sortBy) ? query.sortBy : defaultSort;
    qb.orderBy(`e.${sortBy}`, query.sortOrder === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC);
    if (sortBy !== 'id') qb.addOrderBy('e.id', 'ASC');

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return toPage(
      rows.map((row) => this.toRow(meta, row)),
      total,
      page,
      limit,
    );
  }

  /** Lightweight { id, label } list for searchable FK dropdowns. */
  async options(key: string, query: AdminOptionsQueryDto): Promise<OptionItem[]> {
    const meta = this.entry(key);
    const qb = this.repoOf(meta).createQueryBuilder('e').select('e.id', 'id');
    if (meta.labelField !== 'id') qb.addSelect(`e.${meta.labelField}`, 'label');

    const term = query.search?.trim();
    if (term) {
      qb.where(`CAST(e.${meta.labelField} AS text) ILIKE :term`, { term: `%${escapeLike(term)}%` });
    }
    const rows = await qb
      .orderBy(`e.${meta.labelField}`, 'ASC')
      .limit(query.limit ?? 20)
      .getRawMany<{ id: string; label?: string }>();
    return rows.map((row) => ({ id: row.id, label: String(row.label ?? row.id) }));
  }

  async getOne(key: string, id: string): Promise<Row> {
    const meta = this.entry(key);
    const qb = this.repoOf(meta).createQueryBuilder('e').where('e.id = :id', { id });
    this.joinForeignKeys(qb, meta);
    const entity = await qb.getOne();
    if (!entity) throw AppException.notFound(`${meta.label} not found`);

    const row = this.toRow(meta, entity);
    if (key === ResourceKey.ADMIN_ROLES) {
      row.permissions = await this.access.getMatrix(id, entity.isSystem === true);
    }
    return row;
  }

  // --------------------------------------------------------------------- write
  async create(key: string, body: Row, actor: AuthAdmin): Promise<Row> {
    const meta = this.entry(key);
    this.assertCapability(meta, 'create');

    const { permissions, ...fields } = body;
    const values = await this.buildValues(meta, fields, 'create');
    await this.beforeCreate(meta, values, actor);

    const repo = this.repoOf(meta);
    const saved = await repo.save(repo.create(values));
    if (key === ResourceKey.ADMIN_ROLES && permissions !== undefined) {
      await this.matrices.apply(saved.id as string, this.parseMatrix(permissions));
    }

    await this.audit.log(actor, AuditAction.CREATE, meta, saved.id as string, {
      values,
      ...(permissions !== undefined ? { permissions } : {}),
    });
    return this.getOne(key, saved.id as string);
  }

  async update(key: string, id: string, body: Row, actor: AuthAdmin): Promise<Row> {
    const meta = this.entry(key);
    this.assertCapability(meta, 'update');

    const repo = this.repoOf(meta);
    const existing = await repo.findOneBy({ id });
    if (!existing) throw AppException.notFound(`${meta.label} not found`);

    const { permissions, ...fields } = body;
    const values = await this.buildValues(meta, fields, 'update');
    await this.beforeUpdate(meta, id, values, permissions !== undefined, actor);

    const before = { ...existing } as Row;
    if (Object.keys(values).length > 0) {
      await repo.save(repo.merge(existing, values));
      await this.discardImages(meta, before, values);
    }
    if (key === ResourceKey.ADMIN_ROLES && permissions !== undefined) {
      await this.matrices.apply(id, this.parseMatrix(permissions));
    }

    await this.audit.log(actor, AuditAction.UPDATE, meta, id, {
      changes: values,
      ...(permissions !== undefined ? { permissions } : {}),
    });
    return this.getOne(key, id);
  }

  async remove(key: string, id: string, actor: AuthAdmin): Promise<void> {
    const meta = this.entry(key);
    this.assertCapability(meta, 'delete');

    const snapshot = await this.getOne(key, id);
    await this.beforeDelete(meta, id, actor);
    await this.repoOf(meta).delete(id);
    await this.discardImages(meta, snapshot, this.clearedImages(meta));
    await this.audit.log(actor, AuditAction.DELETE, meta, id, { deleted: snapshot });
  }

  // ------------------------------------------------------------------ pictures
  /** Image fields set to null: what a deleted record no longer points to. */
  private clearedImages(meta: RegistryEntry): Row {
    return Object.fromEntries(
      meta.fields
        .filter((field) => field.type === FieldType.IMAGE)
        .map((field) => [field.name, null]),
    );
  }

  /** Deletes files a record stopped using. Runs after the database write, so a failure keeps them. */
  private async discardImages(meta: RegistryEntry, before: Row, after: Row): Promise<void> {
    const stale: string[] = [];
    for (const field of meta.fields) {
      if (field.type !== FieldType.IMAGE) continue;
      if (!Object.prototype.hasOwnProperty.call(after, field.name)) continue;
      const old = before[field.name];
      if (typeof old === 'string' && old && old !== after[field.name]) stale.push(old);
    }
    await this.storage.removeMany(stale);
  }

  // ------------------------------------------------------------------- hooks
  private async beforeCreate(meta: RegistryEntry, values: Row, actor: AuthAdmin): Promise<void> {
    if (meta.key === ResourceKey.ADMIN_ROLES) {
      values.slug = await this.uniqueSlug(String(values.name));
      values.isSystem = false;
    }
    if (meta.key === ResourceKey.ADMINS) {
      await this.assertCanAssignRole(actor, (values.role as { id: string } | undefined)?.id);
    }
  }

  private async beforeUpdate(
    meta: RegistryEntry,
    id: string,
    values: Row,
    hasMatrix: boolean,
    actor: AuthAdmin,
  ): Promise<void> {
    if (meta.key === ResourceKey.ADMIN_ROLES) {
      const role = await this.dataSource.getRepository(AdminRole).findOneByOrFail({ id });
      if (role.isSystem) {
        throw AppException.forbidden(
          'SYSTEM_ROLE_PROTECTED',
          'The Super Admin role cannot be changed.',
        );
      }
      if (values.isActive === false && actor.roleId === id) {
        throw AppException.badRequest(
          'CANNOT_LOCK_YOURSELF_OUT',
          'You cannot deactivate your own role.',
        );
      }
      if (hasMatrix && actor.roleId === id) {
        throw AppException.badRequest(
          'CANNOT_EDIT_OWN_ROLE',
          'You cannot change the permissions of the role you are signed in with.',
        );
      }
    }

    if (meta.key === ResourceKey.ADMINS) {
      const target = await this.dataSource
        .getRepository(Admin)
        .findOneOrFail({ where: { id }, relations: { role: true } });
      if (target.role.isSystem && !actor.isSystem) {
        throw AppException.forbidden(
          'SYSTEM_ADMIN_PROTECTED',
          'Only a Super Admin can change a Super Admin.',
        );
      }
      const newRoleId = (values.role as { id: string } | undefined)?.id;
      if (newRoleId && newRoleId !== target.roleId) {
        if (target.id === actor.id) {
          throw AppException.badRequest(
            'CANNOT_CHANGE_OWN_ROLE',
            'You cannot change your own role.',
          );
        }
        await this.assertCanAssignRole(actor, newRoleId);
      }
      if (values.isActive === false && target.id === actor.id) {
        throw AppException.badRequest(
          'CANNOT_DEACTIVATE_SELF',
          'You cannot deactivate your own account.',
        );
      }
      const losesSuperAdmin =
        target.role.isSystem &&
        (values.isActive === false || (newRoleId && newRoleId !== target.roleId));
      if (losesSuperAdmin) await this.assertNotLastSuperAdmin(target.id);
    }
  }

  private async beforeDelete(meta: RegistryEntry, id: string, actor: AuthAdmin): Promise<void> {
    if (meta.key === ResourceKey.ADMIN_ROLES) {
      const role = await this.dataSource.getRepository(AdminRole).findOneByOrFail({ id });
      if (role.isSystem) {
        throw AppException.forbidden(
          'SYSTEM_ROLE_PROTECTED',
          'The Super Admin role cannot be deleted.',
        );
      }
    }
    if (meta.key === ResourceKey.ADMINS) {
      if (id === actor.id) {
        throw AppException.badRequest('CANNOT_DELETE_SELF', 'You cannot delete your own account.');
      }
      const target = await this.dataSource
        .getRepository(Admin)
        .findOneOrFail({ where: { id }, relations: { role: true } });
      if (target.role.isSystem) {
        if (!actor.isSystem) {
          throw AppException.forbidden(
            'SYSTEM_ADMIN_PROTECTED',
            'Only a Super Admin can delete a Super Admin.',
          );
        }
        await this.assertNotLastSuperAdmin(id);
      }
    }
  }

  private async assertCanAssignRole(actor: AuthAdmin, roleId: string | undefined): Promise<void> {
    if (!roleId) return;
    const role = await this.dataSource.getRepository(AdminRole).findOneBy({ id: roleId });
    if (!role) throw AppException.badRequest('ROLE_NOT_FOUND', 'The selected role does not exist.');
    if (role.isSystem && !actor.isSystem) {
      throw AppException.forbidden(
        'SYSTEM_ROLE_PROTECTED',
        'Only a Super Admin can assign the Super Admin role.',
      );
    }
  }

  private async assertNotLastSuperAdmin(excludeAdminId: string): Promise<void> {
    const others = await this.dataSource
      .getRepository(Admin)
      .createQueryBuilder('a')
      .innerJoin('a.role', 'r')
      .where('r.isSystem = true AND a.isActive = true AND a.id != :id', { id: excludeAdminId })
      .getCount();
    if (others === 0) {
      throw AppException.conflict(
        'LAST_SUPER_ADMIN',
        'There must always be at least one active Super Admin.',
      );
    }
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'role';
    const repo = this.dataSource.getRepository(AdminRole);
    for (let n = 1; n < 50; n += 1) {
      const slug = n === 1 ? base : `${base}-${n}`;
      if (!(await repo.exists({ where: { slug } }))) return slug;
    }
    return `${base}-${Date.now()}`;
  }

  // ------------------------------------------------------- permission matrix IO
  private parseMatrix(raw: unknown): Record<string, Partial<PermissionFlags>> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw AppException.badRequest(
        'INVALID_PERMISSIONS',
        'permissions must be an object keyed by resource.',
      );
    }
    const parsed: Record<string, Partial<PermissionFlags>> = {};
    for (const [resourceKey, flags] of Object.entries(raw as Row)) {
      if (!getResource(resourceKey)) {
        throw AppException.badRequest('INVALID_PERMISSIONS', `Unknown resource "${resourceKey}".`);
      }
      if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
        throw AppException.badRequest(
          'INVALID_PERMISSIONS',
          `Flags for "${resourceKey}" must be an object.`,
        );
      }
      const clean: Partial<PermissionFlags> = {};
      for (const action of Object.values(PermissionAction)) {
        const value = (flags as Row)[action];
        if (value !== undefined) {
          if (typeof value !== 'boolean') {
            throw AppException.badRequest(
              'INVALID_PERMISSIONS',
              `${resourceKey}.${action} must be true or false.`,
            );
          }
          clean[action] = value;
        }
      }
      parsed[resourceKey] = clean;
    }
    return parsed;
  }

  // ------------------------------------------------------------------ plumbing
  private entry(key: string): RegistryEntry {
    const meta = getResource(key);
    if (!meta) throw AppException.notFound(`Unknown resource "${key}"`);
    return meta;
  }

  private repoOf(meta: RegistryEntry): Repository<ObjectLiteral> {
    return this.dataSource.getRepository(meta.entityMarker);
  }

  private assertCapability(meta: RegistryEntry, action: 'create' | 'update' | 'delete'): void {
    if (!meta.capabilities[action]) {
      throw AppException.forbidden(
        'READ_ONLY_RESOURCE',
        `${meta.labelPlural} cannot be ${action === 'create' ? 'created' : action === 'update' ? 'edited' : 'deleted'} from the admin panel.`,
      );
    }
  }

  private joinForeignKeys(
    qb: ReturnType<Repository<ObjectLiteral>['createQueryBuilder']>,
    meta: RegistryEntry,
  ): void {
    for (const field of meta.fields) {
      if (field.type !== FieldType.FK || !field.fk) continue;
      const alias = `fk_${field.name}`;
      qb.leftJoin(`e.${field.name}`, alias).addSelect([
        ...new Set([`${alias}.id`, `${alias}.${field.fk.labelField}`]),
      ]);
    }
  }

  /** Public shape of a row: declared fields only, secrets removed, FKs expanded to { id, label }. */
  private toRow(meta: RegistryEntry, entity: ObjectLiteral): Row {
    const row: Row = {};
    for (const field of meta.fields) {
      if (field.secret) continue;
      const value = entity[field.name] as unknown;
      if (field.type === FieldType.FK && field.fk) {
        const related = value as Row | null | undefined;
        row[field.name] = related
          ? { id: related.id, label: String(related[field.fk.labelField] ?? related.id) }
          : null;
      } else {
        row[field.name] = value === undefined ? null : value;
      }
    }
    return row;
  }

  /** Validates and coerces a request body against the registry. Unknown keys are ignored. */
  private async buildValues(meta: RegistryEntry, body: Row, mode: Mode): Promise<Row> {
    const metadata = this.dataSource.getMetadata(meta.entityMarker);
    const errors: Record<string, string> = {};
    const values: Row = {};

    for (const field of meta.fields) {
      if (field.readonly) continue;
      if (mode === 'update' && field.immutable) continue;

      if (!Object.prototype.hasOwnProperty.call(body, field.name)) {
        if (mode === 'create') {
          if (field.required && field.defaultValue === undefined) {
            errors[field.name] = `${field.label} is required.`;
          } else if (field.defaultValue !== undefined) {
            values[field.name] = field.defaultValue;
          }
        }
        continue;
      }

      const maxLength = metadata.findColumnWithPropertyName(field.name)?.length;
      const result = this.coerce(
        field,
        body[field.name],
        mode,
        maxLength ? Number(maxLength) : undefined,
      );
      if (result.error) errors[field.name] = result.error;
      else if (!result.skip) values[field.name] = result.value;
    }

    if (Object.keys(errors).length > 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'Some fields are invalid.',
        {
          fields: errors,
        },
      );
    }

    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    for (const field of meta.fields) {
      if (field.type === FieldType.PASSWORD && typeof values[field.name] === 'string') {
        values[field.name] = await hash(values[field.name] as string, rounds);
      }
    }
    return values;
  }

  private coerce(field: FieldMeta, raw: unknown, mode: Mode, maxLength?: number): Coerced {
    const blank =
      raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');

    if (field.type === FieldType.PASSWORD) {
      if (blank) {
        return mode === 'create' && field.required
          ? { error: `${field.label} is required.` }
          : { skip: true };
      }
      if (typeof raw !== 'string' || raw.length < 8 || raw.length > 72) {
        return { error: `${field.label} must be 8 to 72 characters.` };
      }
      return { value: raw };
    }

    if (blank) {
      if (field.type === FieldType.BOOLEAN) return { value: false };
      return field.required ? { error: `${field.label} is required.` } : { value: null };
    }

    switch (field.type) {
      case FieldType.IMAGE: {
        const name = typeof raw === 'string' ? raw.trim() : '';
        return STORED_IMAGE_NAME.test(name)
          ? { value: name }
          : { error: `${field.label} must be an uploaded PNG, JPG or WebP image.` };
      }
      case FieldType.STRING:
      case FieldType.TEXT: {
        if (typeof raw !== 'string') return { error: `${field.label} must be text.` };
        const text = raw.trim();
        if (maxLength && text.length > maxLength) {
          return { error: `${field.label} must be at most ${maxLength} characters.` };
        }
        return { value: text };
      }
      case FieldType.EMAIL: {
        const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (!EMAIL_RE.test(email) || email.length > 255)
          return { error: `${field.label} must be a valid email.` };
        return { value: email };
      }
      case FieldType.PHONE: {
        // International format with country code, e.g. +919876543210 (the UI uses a country-code picker).
        const phone = typeof raw === 'string' ? raw.replace(/[\s-]/g, '') : '';
        return PHONE_RE.test(phone)
          ? { value: phone }
          : { error: `${field.label} must include the country code, e.g. +919876543210.` };
      }
      case FieldType.NUMBER: {
        const num = Number(raw);
        return Number.isInteger(num)
          ? { value: num }
          : { error: `${field.label} must be a whole number.` };
      }
      case FieldType.DECIMAL: {
        const num = Number(raw);
        return Number.isFinite(num)
          ? { value: num }
          : { error: `${field.label} must be a number.` };
      }
      case FieldType.BOOLEAN: {
        if (typeof raw === 'boolean') return { value: raw };
        if (raw === 'true' || raw === 1) return { value: true };
        if (raw === 'false' || raw === 0) return { value: false };
        return { error: `${field.label} must be true or false.` };
      }
      case FieldType.DATE: {
        const ok =
          typeof raw === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
          !Number.isNaN(Date.parse(raw));
        return ok ? { value: raw } : { error: `${field.label} must be a date (YYYY-MM-DD).` };
      }
      case FieldType.TIME: {
        const ok = typeof raw === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(raw);
        return ok ? { value: raw } : { error: `${field.label} must be a time (HH:MM).` };
      }
      case FieldType.DATETIME: {
        const date = new Date(raw as string | number);
        return Number.isNaN(date.getTime())
          ? { error: `${field.label} must be a date and time.` }
          : { value: date };
      }
      case FieldType.ENUM:
        return field.enumValues?.includes(String(raw))
          ? { value: String(raw) }
          : { error: `${field.label} must be one of: ${field.enumValues?.join(', ')}.` };
      case FieldType.ARRAY:
        return Array.isArray(raw) && raw.every((item) => typeof item === 'string')
          ? { value: raw }
          : { error: `${field.label} must be a list of text values.` };
      case FieldType.JSON: {
        if (typeof raw === 'object') return { value: raw };
        try {
          return { value: JSON.parse(String(raw)) as unknown };
        } catch {
          return { error: `${field.label} must be valid JSON.` };
        }
      }
      case FieldType.FK: {
        const id = typeof raw === 'string' ? raw : (raw as { id?: unknown }).id;
        return typeof id === 'string' && UUID_RE.test(id)
          ? { value: { id } }
          : { error: `${field.label} must reference an existing record.` };
      }
      default:
        return { error: `${field.label} has an unsupported type.` };
    }
  }
}
