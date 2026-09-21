import { config as apiConfig } from '@repo/jest-config/api';

/**
 * @type {import('jest').Config}
 * */
const config = {
  ...apiConfig,
  // Coverage is off: this suite is the safety net run on every change, and it
  // has to stay a couple of seconds.
  collectCoverage: false,
  moduleNameMapper: {
    // Read the workspace packages from source: `@repo/db` resolves to its build
    // output, and a unit test should not depend on whether that build has run.
    '^@repo/db/(.*)$': '<rootDir>/../../../packages/db/src/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
