import path from "path";
import {Configuration} from "webpack";

interface Environment {
	production: boolean;
	development: boolean;
}

const config = (env: Environment): Configuration => ({
	context: path.resolve(__dirname),
	entry: {
		index: "./src/index.ts",
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
			},
		],
	},
	target: "node",
	resolve: {
		extensions: [".ts"],
	},
	mode: env.production ? "production" : "development",
	devtool: env.production ? "source-map" : "eval",
});

module.exports = config;
