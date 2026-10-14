import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryModule } from '../history/history.module';
import { RfqsModule } from '../rfqs/rfqs.module';
import { Attachment, Quote } from '../schema';
import { StorageModule } from '../storage/storage.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, Quote]),
    HistoryModule,
    RfqsModule,
    StorageModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
