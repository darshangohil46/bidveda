export enum FieldType {
  STRING = 'string',
  TEXT = 'text',
  NUMBER = 'number',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  EMAIL = 'email',
  /** E.164 phone number with country code. */
  PHONE = 'phone',
  PASSWORD = 'password',
  ENUM = 'enum',
  ARRAY = 'array',
  JSON = 'json',
  FK = 'fk',
  IMAGE = 'image',
}

export interface FieldMeta {
  /** Entity property name (for FK fields: the relation property name). */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  defaultValue?: boolean | string | number;
  enumValues?: string[];
  fk?: { resource: string; labelField: string };
  listVisible?: boolean;
  searchable?: boolean;
  readonly?: boolean;
  /** Can be set when creating a record but not changed afterwards. */
  immutable?: boolean;
  secret?: boolean;
  hint?: string;
}

export interface ResourceCapabilities {
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface ResourceMeta {
  key: string;
  label: string;
  labelPlural: string;
  icon: string;
  group: string;
  groupIcon: string;
  labelField: string;
  capabilities: ResourceCapabilities;
  fields: FieldMeta[];
}

/** Server-side registry entry: public metadata + the TypeORM entity class. */
export interface RegistryEntry extends ResourceMeta {
  entityMarker: new () => object;
}

export interface AdminListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OptionItem {
  id: string;
  label: string;
}

/** A row as the admin API returns it: declared fields only. */
export type AdminRow = Record<string, unknown>;
export type AdminWriteMode = 'create' | 'update';

/** Result of validating one submitted value against its field metadata. */
export interface CoercedValue {
  value?: unknown;
  skip?: boolean;
  error?: string;
}

export type PermissionFlags = Record<'create' | 'read' | 'update' | 'delete', boolean>;
export type PermissionMatrix = Record<string, PermissionFlags>;
