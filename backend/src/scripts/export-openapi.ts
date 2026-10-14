/**
 * `npm run openapi` - writes the OpenAPI document to a file so the API can be read without
 * running anything. It builds the Nest app but never opens an HTTP port.
 * Run it against a throw-away database: it connects to PostgreSQL like the real app does.
 */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { buildSwaggerConfig } from '../swagger.config';

async function run(): Promise<void> {
  const target = resolve(process.argv[2] ?? '../docs/openapi.json');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
  configureApp(app);

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI written to ${target}`);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
