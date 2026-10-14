export enum UserRole {
  BUYER = 'BUYER',
  VENDOR = 'VENDOR',
}

export enum RfqStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  AWARDED = 'AWARDED',
}

export enum QuoteStatus {
  SUBMITTED = 'SUBMITTED',
  SHORTLISTED = 'SHORTLISTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum ActorType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/** `sort` query values of GET /rfqs. */
export enum RfqSort {
  CREATED_DESC = 'created_desc',
  DEADLINE_ASC = 'deadline_asc',
  DEADLINE_DESC = 'deadline_desc',
}

/** `sort` query values of the quote comparison. */
export enum ComparisonSort {
  TOTAL_ASC = 'total_asc',
  TOTAL_DESC = 'total_desc',
  DELIVERY_ASC = 'delivery_asc',
  DELIVERY_DESC = 'delivery_desc',
  SUBMITTED_ASC = 'submitted_asc',
}

/** The key of every table the admin panel manages (the URL segment and the permission's table key). */
export enum ResourceKey {
  ADMINS = 'admins',
  ADMIN_ROLES = 'admin_roles',
  PERMISSIONS = 'permissions',
  ADMIN_AUDIT_LOGS = 'admin_audit_logs',
  USERS = 'users',
  RFQS = 'rfqs',
  RFQ_LINE_ITEMS = 'rfq_line_items',
  QUOTES = 'quotes',
  QUOTE_REVISIONS = 'quote_revisions',
  STATUS_HISTORY = 'status_history',
  ATTACHMENTS = 'attachments',
}
