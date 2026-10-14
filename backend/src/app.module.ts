import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { buildDataSourceOptions } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { HistoryModule } from './history/history.module';
import { MailModule } from './mail/mail.module';
import { QuotesModule } from './quotes/quotes.module';
import { RfqsModule } from './rfqs/rfqs.module';
import { SecurityModule } from './security/security.module';
import { EnvVars } from './types/env.types';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? ['.env.test'] : ['.env'],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        ...buildDataSourceOptions({
          DB_HOST: config.get('DB_HOST', { infer: true }),
          DB_PORT: config.get('DB_PORT', { infer: true }),
          DB_USERNAME: config.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
          DB_NAME: config.get('DB_NAME', { infer: true }),
          DB_SSL: config.get('DB_SSL', { infer: true }),
          DB_LOGGING: config.get('DB_LOGGING', { infer: true }),
        }),
        // Pending migrations run before the app accepts traffic.
        migrationsRun: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        skipIf: () => config.get('THROTTLE_DISABLED', { infer: true }),
      }),
    }),
    ScheduleModule.forRoot(),
    SecurityModule,
    MailModule,
    AuthModule,
    HistoryModule,
    RfqsModule,
    QuotesModule,
    AttachmentsModule,
    AdminModule,
    BootstrapModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
