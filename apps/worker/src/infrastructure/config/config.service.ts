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
        from: '"pathpipe" <no-reply@pathpipe.clementomnes.dev>',
        frontendUrl: this.requireEnv(
          'WORKERS_FRONTEND_URL',
          'http://localhost:3000',
        ),
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
      scraper: {
        concurrency: this.requireEnvAsInt('WORKERS_SCRAPE_CONCURRENCY', 6),
        browserConcurrency: this.requireEnvAsInt(
          'WORKERS_SCRAPE_BROWSER_CONCURRENCY',
          3,
        ),
        userAgent: this.requireEnv(
          'WORKERS_SCRAPE_USER_AGENT',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 PathpipeBot/1.0 (+https://pathpipe.clementomnes.dev/bot)',
        ),
        perHostDelayMs: this.requireEnvAsInt(
          'WORKERS_SCRAPE_HOST_DELAY_MS',
          800,
        ),
        respectRobots:
          this.optionalEnv('WORKERS_SCRAPE_RESPECT_ROBOTS') !== 'false',
        respectRobotsForAts:
          this.optionalEnv('WORKERS_SCRAPE_ROBOTS_FOR_ATS') === 'true',
        fastCron: this.requireEnv('WORKERS_SCRAPE_FAST_CRON', '*/15 * * * *'),
        fullCron: this.requireEnv('WORKERS_SCRAPE_FULL_CRON', '0 */4 * * *'),
        fullIntervalHours: this.requireEnvAsInt(
          'WORKERS_SCRAPE_FULL_INTERVAL_HOURS',
          4,
        ),
        reconcileIntervalHours: this.requireEnvAsInt(
          'WORKERS_SCRAPE_RECONCILE_INTERVAL_HOURS',
          24,
        ),
        maxDurationMs: this.requireEnvAsInt(
          'WORKERS_SCRAPE_MAX_SOURCE_MS',
          150000,
        ),
        maxListingPages: this.requireEnvAsInt(
          'WORKERS_SCRAPE_MAX_LISTING_PAGES',
          10,
        ),
        maxFailuresBeforeBackoff: this.requireEnvAsInt(
          'WORKERS_SCRAPE_MAX_FAILURES',
          4,
        ),
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
    const email = this.config.email;
    if (
      process.env.NODE_ENV === 'production' &&
      (!email.frontendUrl || email.frontendUrl.includes('localhost'))
    ) {
      throw new Error(
        'WORKERS_FRONTEND_URL must be set to the public frontend URL in production',
      );
    }
  }
}

export const configService = new ConfigServiceImpl();
