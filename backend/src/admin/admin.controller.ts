import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuth, AdminSession, CurrentAdmin } from '../security/decorators';
import { AuthAdmin } from '../types/auth.types';
import { AdminAuthService } from './admin-auth.service';
import { AdminService } from './admin.service';
import { AdminListQueryDto, AdminOptionsQueryDto } from './dto/admin.dto';

/**
 * Universal metadata-driven admin API (admin.txt section 6). Static routes are declared
 * before the `:resource` routes so they are matched first.
 */
@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auth: AdminAuthService,
  ) {}

  @Get('me')
  @AdminSession()
  @ApiOperation({ summary: 'Signed-in admin with effective per-resource permissions' })
  me(@CurrentAdmin() admin: AuthAdmin) {
    return this.auth.me(admin);
  }

  @Get('resources')
  @AdminSession()
  @ApiOperation({ summary: 'Metadata for every registered resource (drives the whole admin UI)' })
  resources() {
    return this.admin.getResources();
  }

  @Get('dashboard/counts')
  @AdminSession()
  @ApiOperation({ summary: 'Row counts for every resource the admin may read' })
  counts(@CurrentAdmin() admin: AuthAdmin) {
    return this.admin.dashboardCounts(admin);
  }

  @Get(':resource')
  @AdminAuth()
  @ApiOperation({ summary: 'Paginated list with search, sort and expanded foreign keys' })
  list(@Param('resource') resource: string, @Query() query: AdminListQueryDto) {
    return this.admin.list(resource, query);
  }

  @Get(':resource/options')
  @AdminAuth()
  @ApiOperation({ summary: '{ id, label } options for a searchable foreign-key select' })
  options(@Param('resource') resource: string, @Query() query: AdminOptionsQueryDto) {
    return this.admin.options(resource, query);
  }

  @Get(':resource/:id')
  @AdminAuth()
  @ApiOperation({ summary: 'One record (roles include their permission matrix)' })
  one(@Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getOne(resource, id);
  }

  @Post(':resource')
  @AdminAuth()
  @ApiOperation({ summary: 'Create a record' })
  create(
    @Param('resource') resource: string,
    @Body() body: Record<string, unknown>,
    @CurrentAdmin() admin: AuthAdmin,
  ) {
    return this.admin.create(resource, body, admin);
  }

  @Patch(':resource/:id')
  @AdminAuth()
  @ApiOperation({ summary: 'Update a record' })
  update(
    @Param('resource') resource: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentAdmin() admin: AuthAdmin,
  ) {
    return this.admin.update(resource, id, body, admin);
  }

  @Delete(':resource/:id')
  @AdminAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a record' })
  async remove(
    @Param('resource') resource: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AuthAdmin,
  ): Promise<void> {
    await this.admin.remove(resource, id, admin);
  }
}
