import { Module } from '@nestjs/common';
import { RfqLifecycleService } from './rfq-lifecycle.service';
import { StatusHistoryService } from './status-history.service';

@Module({
  providers: [StatusHistoryService, RfqLifecycleService],
  exports: [StatusHistoryService, RfqLifecycleService],
})
export class HistoryModule {}
