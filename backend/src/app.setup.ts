import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { EnvVars } from './types/env.types';

/** Everything that must be identical in production and in the e2e tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);

  app.setGlobalPrefix('api');
  // The API sits behind the Next.js server, so the client IP arrives in X-Forwarded-For.
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // The default tells browsers to upgrade every sub-request to https, which breaks the
          // Swagger page when the API is served over plain http (local dev, Docker).
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
