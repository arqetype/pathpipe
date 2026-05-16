import { AppConfig, ConfigService } from '@/domain/services/config.service';

export class ConfigServiceImpl implements ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    return {
      workers: {
        port: this.requireEnvAsInt('WORKERS_PORT', 4100),
        cronTimezone: 'Europe/Paris',
      },
      email: {
        host: this.requireEnv('WORKERS_EMAIL_HOST', 'smtp.example.com'),
        port: this.requireEnvAsInt('WORKERS_EMAIL_PORT', 587),
        user: this.requireEnv('WORKERS_EMAIL_USER', ''),
        pass: this.requireEnv('WORKERS_EMAIL_PASS', ''),
        from: '"Pathpipe" <no-reply@pathpipe.com>',
      },
      api: {
        baseUrl: this.requireEnv('WORKERS_API_URL', 'http://localhost:4000'),
        apiKey: this.requireEnv('WORKERS_API_KEY', ''),
      },
      redis: {
        host: this.requireEnv('WORKERS_REDIS_HOST', 'localhost'),
        port: this.requireEnvAsInt('WORKERS_REDIS_PORT', 6379),
        password: this.optionalEnv('WORKERS_REDIS_PASSWORD'),
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
      throw new Error(`Missing integer value for environment variable: ${key}`);
    }
    const parsed = parseInt(value as string, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid integer value for environment variable: ${key}`);
    }
    return parsed;
  }

  private optionalEnv(key: string): string | undefined {
    return process.env[key];
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  async validate(): Promise<void> {
    const api = this.config.api;
    if (!api.baseUrl || !api.apiKey) {
      throw new Error('API configuration is incomplete');
    }
    const redis = this.config.redis;
    if (!redis.host) {
      throw new Error('Redis configuration is incomplete');
    }
  }
}

export const configService = new ConfigServiceImpl();
