import { AdminAuditLog } from './admin-audit-log.entity';
import { AdminRole } from './admin-role.entity';
import { Admin } from './admin.entity';
import { Attachment } from './attachment.entity';
import { Permission } from './permission.entity';
import { QuoteRevisionItem } from './quote-revision-item.entity';
import { QuoteRevision } from './quote-revision.entity';
import { Quote } from './quote.entity';
import { RefreshToken } from './refresh-token.entity';
import { RfqLineItem } from './rfq-line-item.entity';
import { Rfq } from './rfq.entity';
import { RolePermission } from './role-permission.entity';
import { StatusHistory } from './status-history.entity';
import { UserRefreshToken } from './user-refresh-token.entity';
import { User } from './user.entity';

export {
  Admin,
  AdminAuditLog,
  AdminRole,
  Attachment,
  Permission,
  Quote,
  QuoteRevision,
  QuoteRevisionItem,
  RefreshToken,
  Rfq,
  RfqLineItem,
  RolePermission,
  StatusHistory,
  User,
  UserRefreshToken,
};

/** Every entity the app knows about. New tables must be added here. */
export const ALL_ENTITIES = [
  User,
  UserRefreshToken,
  Admin,
  AdminRole,
  Permission,
  RolePermission,
  RefreshToken,
  AdminAuditLog,
  Rfq,
  RfqLineItem,
  Quote,
  QuoteRevision,
  QuoteRevisionItem,
  StatusHistory,
  Attachment,
];
