import { config } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config} */
export default [
  { ignores: ['eslint.config.mjs', 'prettier.config.mjs'] },
  ...config,
];
