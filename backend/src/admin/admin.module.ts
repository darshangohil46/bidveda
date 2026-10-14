import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admin,
  AdminAuditLog,
  AdminRole,
  Permission,
  RefreshToken,
  RolePermission,
} from '../schema';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUploadsController } from './admin-uploads.controller';
import { RolePermissionService } from './role-permission.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      AdminRole,
      Permission,
      RolePermission,
      RefreshToken,
      AdminAuditLog,
    ]),
    StorageModule,
  ],
  // The specific controllers go first: `auth/admin/*` and `admin/uploads/*` must never be
  // shadowed by the catch-all `admin/:resource`.
  controllers: [AdminAuthController, AdminUploadsController, AdminController],
  providers: [AdminService, AdminAuthService, AdminAuditService, RolePermissionService],
  exports: [AdminAuthService, RolePermissionService],
})
export class AdminModule {}
