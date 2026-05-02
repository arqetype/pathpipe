import { AppConfig, ConfigService } from '@/domain/services/config.service';

export class ConfigServiceImpl implements ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    return {
      database: {
        host: this.requireEnv('WORKERS_DATABASE_HOST', 'localhost'),
        port: this.requireEnvAsInt('WORKERS_DATABASE_PORT', 5432),
        username: this.requireEnv('WORKERS_DATABASE_USER', 'your_db_user'),
        password: this.requireEnv('WORKERS_DATABASE_PASS', 'your_db_password'),
        name: this.requireEnv('WORKERS_DATABASE_NAME', 'weaver'),
      },
      workers: {
        port: this.requireEnvAsInt('WORKERS_PORT', 4100),
        cronTimezone: 'Europe/Paris',
      },
      email: {
        host: this.requireEnv('WORKERS_EMAIL_HOST', 'smtp.example.com'),
        port: this.requireEnvAsInt('WORKERS_EMAIL_PORT', 587),
        user: this.requireEnv('WORKERS_EMAIL_USER', ''),
        pass: this.requireEnv('WORKERS_EMAIL_PASS', ''),
        from: '"Weaver" <no-reply@weareweaver.org>',
      },
    };
  }

  private requireEnv(key: string, fallback?: string): string {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private requireEnvAsInt(key: string, fallback?: number): number {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    const parsed = parseInt(value as string, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid integer value for environment variable: ${key}`);
    }
    return parsed;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  async validate(): Promise<void> {
    const db = this.config.database;
    if (!db.host || !db.name) {
      throw new Error('Database configuration is incomplete');
    }
  }
}

export const configService = new ConfigServiceImpl();
