import { config as baseConfig } from "./base.js";

/**
 * @type {import("jest").Config}
 * */
const config = {
  ...baseConfig,
  rootDir: "src",
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};

export { config };
