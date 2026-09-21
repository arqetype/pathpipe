/**
 * Worker configuration, read from the environment once at startup.
 *
 * The `WORKERS_SCRAPE_*` env names are deliberately left alone: they are the
 * deployment's contract with this process. The code they feed is called
 * "discovery" everywhere else — renaming the variables would break a running
 * deployment for a cosmetic gain.
 */

export interface WorkersConfig {
  port: number;
  cronTimezone: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  frontendUrl: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface DiscoveryConfig {
  /** Boards read at the same time. */
  concurrency: number;
  userAgent: string;
  /** Minimum gap between two requests to the same host, in ms. */
  perHostDelayMs: number;
  respectRobots: boolean;
  /** Also apply robots.txt to the vendor board APIs (see pipeline docs). */
  respectRobotsForAts: boolean;
  /** Cheap poll: descriptions skipped, compared against the last fingerprint. */
  fastCron: string;
  /** Full poll: every field, every source that is due. */
  fullCron: string;
  /** Board discovery: finds new companies to read. Much slower cadence. */
  seedCron: string;
  /** Hours after which a source is re-read in full. */
  fullIntervalHours: number;
  /** Hours after which an unchanged source is re-synced to the database anyway. */
  reconcileIntervalHours: number;
  /** Consecutive failures after which a source is backed off. */
  maxFailuresBeforeBackoff: number;
  /**
   * Requests allowed to one hostname per cycle.
   *
   * Hundreds of boards can share one vendor host, so a per-source cap does not
   * bound what that host receives from us — this does.
   */
  maxRequestsPerHost: number;
  /** Consecutive 429s before a host is left alone for the rest of the cycle. */
  maxRateLimitStrikes: number;
}

export interface AppConfig {
  workers: WorkersConfig;
  email: EmailConfig;
  api: ApiConfig;
  redis: RedisConfig;
  discovery: DiscoveryConfig;
}

export interface ConfigService {
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
  validate(): Promise<void>;
}

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
      discovery: {
        concurrency: this.requireEnvAsInt('WORKERS_SCRAPE_CONCURRENCY', 6),
        userAgent: this.requireEnv(
          'WORKERS_SCRAPE_USER_AGENT',
          'PathpipeBot/1.0 (+https://pathpipe.clementomnes.dev/bot)',
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
        // Boards are found once a day: the roster of companies hiring moves in
        // days, and every candidate costs a request to somebody's API.
        seedCron: this.requireEnv('WORKERS_SCRAPE_SEED_CRON', '0 3 * * *'),
        fullIntervalHours: this.requireEnvAsInt(
          'WORKERS_SCRAPE_FULL_INTERVAL_HOURS',
          4,
        ),
        reconcileIntervalHours: this.requireEnvAsInt(
          'WORKERS_SCRAPE_RECONCILE_INTERVAL_HOURS',
          24,
        ),
        maxFailuresBeforeBackoff: this.requireEnvAsInt(
          'WORKERS_SCRAPE_MAX_FAILURES',
          4,
        ),
        maxRequestsPerHost: this.requireEnvAsInt(
          'WORKERS_SCRAPE_MAX_REQUESTS_PER_HOST',
          1500,
        ),
        maxRateLimitStrikes: this.requireEnvAsInt(
          'WORKERS_SCRAPE_MAX_RATE_LIMIT_STRIKES',
          3,
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
