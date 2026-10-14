import { PermissionAction } from './enums';

/** An explicit permission pinned to a route with @RequirePermission(). */
export interface RequiredPermission {
  tableKey: string;
  action: PermissionAction;
}
