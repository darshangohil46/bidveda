import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from '../schema';
import { AuthAdmin } from '../types/auth.types';
import { AuditAction } from '../types/enums';
import { RegistryEntry } from '../types/admin.types';

const REDACTED = '[REDACTED]';

/** Append-only record of everything an admin changes in the panel. */
@Injectable()
export class AdminAuditService {
  constructor(@InjectRepository(AdminAuditLog) private readonly logs: Repository<AdminAuditLog>) {}

  async log(
    admin: AuthAdmin,
    action: AuditAction,
    meta: RegistryEntry,
    recordId: string | null,
    details: Record<string, unknown> | null,
  ): Promise<void> {
    await this.logs.save(
      this.logs.create({
        adminId: admin.id,
        adminName: admin.name,
        adminEmail: admin.email,
        action,
        resource: meta.key,
        recordId,
        details: details ? this.redact(meta, details) : null,
      }),
    );
  }

  /** Secrets never reach the log, whatever the payload looks like. */
  private redact(meta: RegistryEntry, details: Record<string, unknown>): Record<string, unknown> {
    const secretNames = new Set(
      meta.fields.filter((field) => field.secret).map((field) => field.name),
    );
    secretNames.add('password');
    return JSON.parse(
      JSON.stringify(details, (key, value: unknown) => (secretNames.has(key) ? REDACTED : value)),
    ) as Record<string, unknown>;
  }
}
