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

export interface ScraperConfig {
  /** Careers pages crawled at the same time. */
  concurrency: number;
  userAgent: string;
  /** Minimum gap between two requests to the same host, in ms. */
  perHostDelayMs: number;
  respectRobots: boolean;
  /** Also apply robots.txt to the vendor board APIs (see pipeline docs). */
  respectRobotsForAts: boolean;
  /** Cheap poll: conditional GET, no browser. */
  fastCron: string;
  /** Full poll: the whole ladder, browser included. */
  fullCron: string;
  /** Hours after which a source is re-crawled with the full ladder. */
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
  scraper: ScraperConfig;
}

export interface ConfigService {
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
  validate(): Promise<void>;
}
