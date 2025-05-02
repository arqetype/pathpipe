import { config as webConfig } from '@repo/jest-config/web';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

export const config = {
  ...webConfig,
};

export default async () => {
  const nextJestConfig = await createJestConfig(config)();
  return nextJestConfig;
};
