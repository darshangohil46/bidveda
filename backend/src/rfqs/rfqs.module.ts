import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryModule } from '../history/history.module';
import { Attachment, Quote, Rfq, RfqLineItem, StatusHistory } from '../schema';
import { StorageModule } from '../storage/storage.module';
import { RfqAccessService } from './rfq-access.service';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rfq, RfqLineItem, Quote, Attachment, StatusHistory]),
    HistoryModule,
    StorageModule,
  ],
  controllers: [RfqsController],
  providers: [RfqsService, RfqAccessService],
  exports: [RfqsService, RfqAccessService],
})
export class RfqsModule {}
