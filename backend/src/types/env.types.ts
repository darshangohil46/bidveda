/** Untyped input to the env validator (process.env or a test object). */
export type RawEnv = Record<string, unknown>;

/** The slice of the environment the database connection needs. */
export type DatabaseEnv = Pick<
  EnvVars,
  'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_SSL' | 'DB_LOGGING'
>;

export interface EnvVars {
  NODE_ENV: string;
  PORT: number;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
  SWAGGER_ENABLED: boolean;

  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  DB_LOGGING: boolean;

  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_TTL_MINUTES: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  BCRYPT_ROUNDS: number;
  THROTTLE_DISABLED: boolean;

  SUPER_ADMIN_NAME: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;

  UPLOAD_DIR: string;
  MAX_UPLOAD_MB: number;

  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  MAIL_FROM: string;
}
