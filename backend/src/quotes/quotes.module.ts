import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryModule } from '../history/history.module';
import { RfqsModule } from '../rfqs/rfqs.module';
import {
  Attachment,
  Quote,
  QuoteRevision,
  QuoteRevisionItem,
  Rfq,
  RfqLineItem,
  User,
} from '../schema';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quote,
      QuoteRevision,
      QuoteRevisionItem,
      Rfq,
      RfqLineItem,
      Attachment,
      User,
    ]),
    HistoryModule,
    RfqsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
