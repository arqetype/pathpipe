import { nestJSConfig } from '@repo/eslint-config/nest-js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...nestJSConfig,
  {
    ignores: ['eslint.config.mjs', 'jest.config.mjs', 'prettier.config.mjs'],
  },
];
