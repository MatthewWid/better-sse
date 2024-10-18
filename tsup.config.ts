import {defineConfig} from "tsup";

export default defineConfig({
	entry: ["./src/index.ts"],
	outDir: "build",
	clean: true,
	dts: true,
	format: ["esm", "cjs"],
});
