/**
 * Every fixed set of values the app compares against lives here, once.
 * The first group mirrors backend/src/types/enums.ts (same names, same wire values), so a role or
 * status is never typed as a loose string in a component.
 */

// ---------------------------------------------------------------- shared with the API
export enum UserRole {
  BUYER = "BUYER",
  VENDOR = "VENDOR",
}

export enum RfqStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  CLOSED = "CLOSED",
  AWARDED = "AWARDED",
}

export enum QuoteStatus {
  SUBMITTED = "SUBMITTED",
  SHORTLISTED = "SHORTLISTED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export enum ActorType {
  USER = "USER",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
}

export enum PermissionAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}

/** How the admin panel draws and validates a field; chosen by the backend registry. */
export enum FieldType {
  STRING = "string",
  TEXT = "text",
  NUMBER = "number",
  DECIMAL = "decimal",
  BOOLEAN = "boolean",
  DATE = "date",
  TIME = "time",
  DATETIME = "datetime",
  EMAIL = "email",
  PHONE = "phone",
  PASSWORD = "password",
  ENUM = "enum",
  ARRAY = "array",
  JSON = "json",
  FK = "fk",
  IMAGE = "image",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

/** `sort` query values of GET /rfqs. */
export enum RfqSort {
  CREATED_DESC = "created_desc",
  DEADLINE_ASC = "deadline_asc",
  DEADLINE_DESC = "deadline_desc",
}

/** `sort` query values of the quote comparison. */
export enum ComparisonSort {
  TOTAL_ASC = "total_asc",
  TOTAL_DESC = "total_desc",
  DELIVERY_ASC = "delivery_asc",
  DELIVERY_DESC = "delivery_desc",
  SUBMITTED_ASC = "submitted_asc",
}

/** The key of every table the admin panel manages: the API path segment and the permission table key. */
export enum ResourceKey {
  ADMINS = "admins",
  ADMIN_ROLES = "admin_roles",
  PERMISSIONS = "permissions",
  ADMIN_AUDIT_LOGS = "admin_audit_logs",
  USERS = "users",
  RFQS = "rfqs",
  RFQ_LINE_ITEMS = "rfq_line_items",
  QUOTES = "quotes",
  QUOTE_REVISIONS = "quote_revisions",
  STATUS_HISTORY = "status_history",
  ATTACHMENTS = "attachments",
}

// ------------------------------------------------------------------- front end only
export enum AuthStatus {
  LOADING = "loading",
  AUTHENTICATED = "authenticated",
  UNAUTHENTICATED = "unauthenticated",
}

/** The admin record modal is used three ways. */
export enum FormMode {
  CREATE = "create",
  EDIT = "edit",
  VIEW = "view",
}

export enum PickerMode {
  DATE = "date",
  TIME = "time",
  DATETIME = "datetime",
}

/** Narrow an untrusted string (a URL parameter, say) to a UserRole, or null. */
export function toUserRole(value: string | null | undefined): UserRole | null {
  const upper = value?.toUpperCase();
  return Object.values(UserRole).find((role) => role === upper) ?? null;
}
