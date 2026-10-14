import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, UserAuth } from '../security/decorators';
import { AuthUser } from '../types/auth.types';
import { UserRole } from '../types/enums';
import {
  AwardDto,
  ComparisonQueryDto,
  ListMyQuotesQueryDto,
  UpsertQuoteDto,
} from './dto/quote.dto';
import { QuotesService } from './quotes.service';

@ApiTags('Quotes')
@Controller()
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Put('rfqs/:rfqId/my-quote')
  @UserAuth(UserRole.VENDOR)
  @ApiOperation({
    summary:
      'Submit or revise my quote. Rejected with 409 DEADLINE_PASSED after the RFQ deadline. Each change adds a revision.',
  })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('rfqId', ParseUUIDPipe) rfqId: string,
    @Body() dto: UpsertQuoteDto,
  ) {
    return this.quotes.upsertMine(user, rfqId, dto);
  }

  @Get('rfqs/:rfqId/my-quote')
  @UserAuth(UserRole.VENDOR)
  @ApiOperation({
    summary: 'My quote on this RFQ with its revision history ({ quote: null } if none)',
  })
  mine(@CurrentUser() user: AuthUser, @Param('rfqId', ParseUUIDPipe) rfqId: string) {
    return this.quotes.getMine(user, rfqId);
  }

  @Get('rfqs/:rfqId/comparison')
  @UserAuth(UserRole.BUYER)
  @ApiOperation({ summary: 'All quotes on my RFQ side by side; sort by total or delivery time' })
  comparison(
    @CurrentUser() user: AuthUser,
    @Param('rfqId', ParseUUIDPipe) rfqId: string,
    @Query() query: ComparisonQueryDto,
  ) {
    return this.quotes.comparison(user, rfqId, query.sort);
  }

  @Post('rfqs/:rfqId/quotes/:quoteId/shortlist')
  @UserAuth(UserRole.BUYER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shortlist a quote (RFQ must be closed)' })
  shortlist(
    @CurrentUser() user: AuthUser,
    @Param('rfqId', ParseUUIDPipe) rfqId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ) {
    return this.quotes.shortlist(user, rfqId, quoteId);
  }

  @Post('rfqs/:rfqId/award')
  @UserAuth(UserRole.BUYER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Award the RFQ to one quote: that quote becomes ACCEPTED, the rest REJECTED, the RFQ AWARDED',
  })
  award(
    @CurrentUser() user: AuthUser,
    @Param('rfqId', ParseUUIDPipe) rfqId: string,
    @Body() dto: AwardDto,
  ) {
    return this.quotes.award(user, rfqId, dto);
  }

  @Get('quotes/mine')
  @UserAuth(UserRole.VENDOR)
  @ApiOperation({ summary: 'My quotes across all RFQs' })
  listMine(@CurrentUser() user: AuthUser, @Query() query: ListMyQuotesQueryDto) {
    return this.quotes.listMine(user, query);
  }

  @Get('quotes/:id')
  @UserAuth(UserRole.BUYER, UserRole.VENDOR)
  @ApiOperation({ summary: 'One quote with its revisions (owner vendor or owning buyer only)' })
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.getQuote(user, id);
  }
}
