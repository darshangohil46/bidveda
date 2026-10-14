import { EnvVars, RawEnv } from '../types/env.types';

function str(raw: RawEnv, key: string, fallback?: string): string {
  const value = raw[key];
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return fallback;
  }
  return String(value);
}

function optionalStr(raw: RawEnv, key: string): string {
  const value = raw[key];
  return value === undefined || value === null ? '' : String(value);
}

function num(raw: RawEnv, key: string, fallback: number): number {
  const value = raw[key];
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function bool(raw: RawEnv, key: string, fallback: boolean): boolean {
  const value = raw[key];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

/** Turns process.env into a typed, validated object. Fails fast with a readable message. */
export function validateEnv(raw: RawEnv): EnvVars {
  const env: EnvVars = {
    NODE_ENV: str(raw, 'NODE_ENV', 'development'),
    PORT: num(raw, 'PORT', 5000),
    CORS_ORIGIN: str(raw, 'CORS_ORIGIN', 'http://localhost:3000'),
    FRONTEND_URL: str(raw, 'FRONTEND_URL', 'http://localhost:3000'),
    SWAGGER_ENABLED: bool(raw, 'SWAGGER_ENABLED', true),

    DB_HOST: str(raw, 'DB_HOST', 'localhost'),
    DB_PORT: num(raw, 'DB_PORT', 5432),
    DB_USERNAME: str(raw, 'DB_USERNAME', 'postgres'),
    DB_PASSWORD: optionalStr(raw, 'DB_PASSWORD'),
    DB_NAME: str(raw, 'DB_NAME'),
    DB_SSL: bool(raw, 'DB_SSL', false),
    DB_LOGGING: bool(raw, 'DB_LOGGING', false),

    JWT_ACCESS_SECRET: str(raw, 'JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: str(raw, 'JWT_REFRESH_SECRET'),
    ACCESS_TOKEN_TTL_MINUTES: num(raw, 'ACCESS_TOKEN_TTL_MINUTES', 15),
    REFRESH_TOKEN_TTL_DAYS: num(raw, 'REFRESH_TOKEN_TTL_DAYS', 7),
    BCRYPT_ROUNDS: num(raw, 'BCRYPT_ROUNDS', 12),
    THROTTLE_DISABLED: bool(raw, 'THROTTLE_DISABLED', false),

    SUPER_ADMIN_NAME: str(raw, 'SUPER_ADMIN_NAME', 'Super Admin'),
    SUPER_ADMIN_EMAIL: str(raw, 'SUPER_ADMIN_EMAIL'),
    SUPER_ADMIN_PASSWORD: str(raw, 'SUPER_ADMIN_PASSWORD'),

    UPLOAD_DIR: str(raw, 'UPLOAD_DIR', './uploads'),
    MAX_UPLOAD_MB: num(raw, 'MAX_UPLOAD_MB', 10),

    SMTP_HOST: optionalStr(raw, 'SMTP_HOST'),
    SMTP_PORT: num(raw, 'SMTP_PORT', 587),
    SMTP_SECURE: bool(raw, 'SMTP_SECURE', false),
    SMTP_USER: optionalStr(raw, 'SMTP_USER'),
    SMTP_PASS: optionalStr(raw, 'SMTP_PASS'),
    MAIL_FROM: str(raw, 'MAIL_FROM', 'Bidveda <no-reply@bidveda.test>'),
  };

  if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters long');
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }
  return env;
}
