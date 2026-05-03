export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

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
}

export interface AppConfig {
  database: DatabaseConfig;
  workers: WorkersConfig;
  email: EmailConfig;
}

export interface ConfigService {
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
  validate(): Promise<void>;
}
