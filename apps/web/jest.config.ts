import type { Config } from 'jest'
import { config as webConfig } from "@repo/jest-config/web"
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

export const config: Config = {
  ...webConfig,
};

export default async (): Promise<Config> => {
  const nextJestConfig = await createJestConfig(config)();
  return nextJestConfig;
}
