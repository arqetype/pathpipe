import { config as apiConfig } from '@repo/jest-config/api';

/**
 * @type {import('jest').Config}
 * */
const config = {
  ...apiConfig,
  // Read the workspace packages from source: `@repo/db` resolves to its build
  // output, and a unit test should not depend on whether that build has run.
  moduleNameMapper: {
    '^@repo/db/(.*)$': '<rootDir>/../../../packages/db/src/$1',
  },
};

export default config;
