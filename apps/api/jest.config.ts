import type { Config } from 'jest';
import { config as apiConfig } from '@repo/jest-config/api';

const config: Config = {
  ...apiConfig,
};

export default config;
