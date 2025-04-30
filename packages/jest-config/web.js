import { config as baseConfig } from "./base.js";

/**
 * @type {import("jest").Config}
 * */
const config = {
  ...baseConfig,
  moduleFileExtensions: ["js", "ts", "json", "jsx", "tsx"],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
  ],
};

export { config };
