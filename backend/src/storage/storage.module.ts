import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EnvVars } from '../types/env.types';
import { FileStorageService } from './file-storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        storage: memoryStorage(),
        limits: {
          fileSize: config.get('MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024,
          files: 1,
        },
      }),
    }),
  ],
  providers: [FileStorageService],
  exports: [FileStorageService, MulterModule],
})
export class StorageModule {}
