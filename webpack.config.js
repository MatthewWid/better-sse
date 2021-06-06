const path = require("path");

const config = (env) => ({
	context: path.resolve(__dirname),
	entry: {
		index: "./src/index.ts",
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "build"),
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
