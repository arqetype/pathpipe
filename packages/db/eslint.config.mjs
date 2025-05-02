import { dbConfig } from '@repo/eslint-config/db';

/** @type {import("eslint").Linter.Config} */
export default [
  { ignores: ['eslint.config.mjs', 'prettier.config.mjs'] },
  ...dbConfig,
];
