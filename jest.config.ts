import type {Config} from "@jest/types";

const config: Config.InitialOptions = {
	preset: "ts-jest",
	coveragePathIgnorePatterns: [
		"<rootDir>/src/lib/(testUtils|TypedEmitter).ts",
	],
};

module.exports = config;
