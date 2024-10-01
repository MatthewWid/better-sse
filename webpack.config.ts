import path from "path";
import {Configuration} from "webpack";
import {Options} from "ts-loader";

const config = (): Configuration => ({
	context: path.resolve(__dirname),
	target: "node",
	mode: "production",
	devtool: "source-map",
	entry: {
		http1: "./src/adapters/http1/index.ts",
		http2: "./src/adapters/http2/index.ts",
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "build"),
		library: {
			type: "umd",
		},
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					configFile: "tsconfig.build.json",
				} as Options,
			},
		],
	},
	resolve: {
		extensions: [".ts"],
	},
});

module.exports = config;
