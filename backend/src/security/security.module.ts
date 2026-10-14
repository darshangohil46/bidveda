import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Admin,
  AdminRole,
  Permission,
  RefreshToken,
  RolePermission,
  User,
  UserRefreshToken,
} from '../schema';
import { AdminAccessService } from './admin-access.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserJwtGuard } from './guards/user-jwt.guard';
import { TokenService } from './token.service';

/** Global so any module can use `@UserAuth()` / `@AdminAuth()` without re-wiring providers. */
@Global()
@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      User,
      UserRefreshToken,
      Admin,
      AdminRole,
      Permission,
      RolePermission,
      RefreshToken,
    ]),
  ],
  providers: [
    TokenService,
    AdminAccessService,
    UserJwtGuard,
    RolesGuard,
    AdminJwtGuard,
    PermissionGuard,
  ],
  exports: [
    JwtModule,
    TypeOrmModule,
    TokenService,
    AdminAccessService,
    UserJwtGuard,
    RolesGuard,
    AdminJwtGuard,
    PermissionGuard,
  ],
})
export class SecurityModule {}
