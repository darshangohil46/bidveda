import { DataSourceOptions } from 'typeorm';
import { MIGRATIONS } from '../migrations';
import { ALL_ENTITIES } from '../schema';
import { DatabaseEnv } from '../types/env.types';

/** Shared by the Nest app and the TypeORM CLI (src/data-source.ts). */
export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    entities: ALL_ENTITIES,
    migrations: MIGRATIONS,
    // gen_random_uuid() is built into PostgreSQL 13+, so no extension is needed.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    synchronize: false,
    logging: env.DB_LOGGING ? ['query', 'error'] : ['error'],
    extra: { max: 10 },
  };
}
