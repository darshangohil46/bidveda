import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin, AdminRole, Permission, RolePermission } from '../schema';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, AdminRole, Permission, RolePermission])],
  providers: [BootstrapService],
})
export class BootstrapModule {}
