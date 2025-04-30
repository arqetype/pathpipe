/**
 * @type {import("jest").Config}
 * */
const config = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  moduleFileExtensions: ["js", "ts", "json"],
  testEnvironment: "jsdom",
};

export { config };
