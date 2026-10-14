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
import { CurrentUser, UserAuth } from '../security/decorators';
import { AuthUser } from '../types/auth.types';
import { UserRole } from '../types/enums';
import { CreateRfqDto, ListRfqsQueryDto, UpdateRfqDto } from './dto/rfq.dto';
import { RfqsService } from './rfqs.service';

@ApiTags('RFQs')
@Controller('rfqs')
export class RfqsController {
  constructor(private readonly rfqs: RfqsService) {}

  @Post()
  @UserAuth(UserRole.BUYER)
  @ApiOperation({ summary: 'Create an RFQ as a draft' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRfqDto) {
    return this.rfqs.create(user, dto);
  }

  @Get()
  @UserAuth(UserRole.BUYER, UserRole.VENDOR)
  @ApiOperation({
    summary:
      'List RFQs. Buyers get their own (filter by status); vendors get open RFQs (keyword, category, location, deadline).',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListRfqsQueryDto) {
    return this.rfqs.list(user, query);
  }

  @Get(':id')
  @UserAuth(UserRole.BUYER, UserRole.VENDOR)
  @ApiOperation({ summary: 'RFQ detail with line items and attachments' })
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqs.getDetail(user, id);
  }

  @Patch(':id')
  @UserAuth(UserRole.BUYER)
  @ApiOperation({
    summary:
      'Edit a draft or an open RFQ (line items are replaced when sent, unless vendors have already quoted)',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRfqDto,
  ) {
    return this.rfqs.update(user, id, dto);
  }

  @Delete(':id')
  @UserAuth(UserRole.BUYER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft RFQ' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.rfqs.remove(user, id);
  }

  @Post(':id/publish')
  @UserAuth(UserRole.BUYER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft RFQ: DRAFT -> PUBLISHED' })
  publish(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqs.publish(user, id);
  }

  @Get(':id/history')
  @UserAuth(UserRole.BUYER, UserRole.VENDOR)
  @ApiOperation({ summary: 'Status history of the RFQ and its quotes' })
  history(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqs.getHistory(user, id);
  }
}
