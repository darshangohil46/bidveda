import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

loadEnv({ path: '.env.test', quiet: true });

/** Wipes the test schema. Refuses to run against anything that is not clearly a test database. */
async function resetDatabase(): Promise<void> {
  const database = process.env.DB_NAME ?? '';
  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to reset "${database}": the e2e database name must end with _test`);
  }
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database,
  });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }
}

/** Boots the real application (migrations + bootstrap included) against a clean database. */
export async function createTestApp(): Promise<NestExpressApplication> {
  await resetDatabase();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
