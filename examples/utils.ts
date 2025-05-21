import {readFileSync} from "node:fs";
import {join, resolve} from "node:path";

export const getPublicDirPath = (baseDir: string) =>
	resolve(baseDir, "./public");

export const getFrontendFiles = (baseDir: string) => {
	const publicDir = getPublicDirPath(baseDir);

	const indexHtmlPath = join(publicDir, "./index.html");
	const indexJsPath = join(publicDir, "./index.js");

	const indexHtmlContent = readFileSync(indexHtmlPath, "utf8");
	const indexJsContent = readFileSync(indexJsPath, "utf8");

	return {
		publicDir,
		indexHtmlPath,
		indexJsPath,
		indexHtmlContent,
		indexJsContent,
	};
};
