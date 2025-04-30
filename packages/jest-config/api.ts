import type { Config } from "jest";
import { config as baseConfig } from "./base";

const config: Config = {
  ...baseConfig,
  rootDir: "src",
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
} as const;

export { config };
