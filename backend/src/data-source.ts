import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './config/database.config';
import { validateEnv } from './config/env.validation';

/** Used only by the TypeORM CLI: `npm run migration:run` / `migration:revert`. */
export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));
