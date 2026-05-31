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

export interface AppConfig {
  workers: WorkersConfig;
  email: EmailConfig;
  api: ApiConfig;
  redis: RedisConfig;
}

export interface ConfigService {
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
  validate(): Promise<void>;
}
