import { validateEnv } from './env.validation';

const base = {
  DB_NAME: 'bidveda',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
  SUPER_ADMIN_EMAIL: 'root@example.test',
  SUPER_ADMIN_PASSWORD: 'Secret@123',
};

describe('validateEnv', () => {
  it('applies defaults and coerces types', () => {
    const env = validateEnv({ ...base, PORT: '6000', DB_SSL: 'true' });
    expect(env.PORT).toBe(6000);
    expect(env.DB_SSL).toBe(true);
    expect(env.ACCESS_TOKEN_TTL_MINUTES).toBe(15);
    expect(env.SMTP_HOST).toBe('');
  });

  it('fails fast when a required variable is missing', () => {
    expect(() => validateEnv({ ...base, DB_NAME: undefined })).toThrow('DB_NAME');
  });

  it('refuses weak or identical JWT secrets', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow('32 characters');
    expect(() => validateEnv({ ...base, JWT_REFRESH_SECRET: base.JWT_ACCESS_SECRET })).toThrow(
      'different',
    );
  });
});
