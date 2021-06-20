import type {Config} from "@jest/types";

const config: Config.InitialOptions = {
	preset: "ts-jest",
	testEnvironment: "node",
	coveragePathIgnorePatterns: ["<rootDir>/src/lib/testUtils.ts"],
};

module.exports = config;
