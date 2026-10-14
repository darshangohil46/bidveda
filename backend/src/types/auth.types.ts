import type { Request } from 'express';
import { UserRole } from './enums';

/** Claims inside a buyer/vendor access token. */
export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
  /** Session (refresh token row) id, so logout can kill the access token early. */
  sid: string;
}

/** Claims inside an admin access token. */
export interface JwtAdminPayload {
  sub: string;
  email: string;
  roleId: string;
  roleName: string;
  sid: string;
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;
}

/** The authenticated buyer/vendor attached to `request.user`. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

/** The authenticated admin attached to `request.admin`. */
export interface AuthAdmin {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  isSystem: boolean;
  sessionId: string;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
}

export interface RequestWithAdmin extends Request {
  admin: AuthAdmin;
}

export interface SessionMeta {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
  phone: string | null;
}

export interface UserAuthResult {
  accessToken: string;
  /** Returned to the Next.js server only; it stores it in an HttpOnly cookie. */
  refreshToken: string;
  user: PublicUser;
}

/** One signed-in device, as shown on the account page. */
export interface SessionView {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  isSystem: boolean;
  permissions: Record<string, Record<'create' | 'read' | 'update' | 'delete', boolean>>;
}

export interface AdminAuthResult {
  accessToken: string;
  refreshToken: string;
  admin: AdminProfile;
}
