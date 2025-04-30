import { Config } from "jest";
import { config as baseConfig } from "./base";

const config: Config = {
  ...baseConfig,
  moduleFileExtensions: ["js", "ts", "json", "jsx", "tsx"],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
  ],
};

export { config };
