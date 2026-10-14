import type {
  AuthStatus,
  FieldType,
  PermissionAction,
  SortOrder,
} from "@/types/enums";

export interface FieldMeta {
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
  immutable?: boolean;
  secret?: boolean;
  hint?: string;
}

export interface ResourceMeta {
  key: string;
  label: string;
  labelPlural: string;
  icon: string;
  group: string;
  groupIcon: string;
  labelField: string;
  capabilities: { create: boolean; update: boolean; delete: boolean };
  fields: FieldMeta[];
}

export type PermissionFlags = Record<PermissionAction, boolean>;
export type PermissionMatrix = Record<string, PermissionFlags>;

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  isSystem: boolean;
  permissions: PermissionMatrix;
}

export interface AdminSession {
  accessToken: string;
  admin: AdminProfile;
}

export interface AdminState {
  status: AuthStatus;
  admin: AdminProfile | null;
  resources: ResourceMeta[];
}

export interface AdminContextValue extends AdminState {
  /** Does this admin's role allow `action` on `resource`? (The server enforces it again.) */
  can: (resource: string, action: PermissionAction) => boolean;
  logout: () => Promise<void>;
}

export interface FkValue {
  id: string;
  label: string;
}

export type ResourceRow = Record<string, unknown> & { id: string };

export type ResourceListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
};

export interface OptionItem {
  id: string;
  label: string;
}
