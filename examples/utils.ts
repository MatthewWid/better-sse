import {readFileSync} from "node:fs";
import {join, resolve} from "node:path";

export const getPublicDirPath = (baseDir: string) =>
	resolve(baseDir, "./public");

export const getFrontendFiles = (baseDir: string) => {
	const publicDir = getPublicDirPath(baseDir);

	const indexHtmlPath = join(publicDir, "./index.html");
	const indexJsPath = join(publicDir, "./index.js");
	const indexCssPath = join(publicDir, "./index.css");

	const indexHtmlContent = readFileSync(indexHtmlPath, "utf8");

	let indexJsContent: string;

	try {
		indexJsContent = readFileSync(indexJsPath, "utf8");
	} catch (_) {
		indexJsContent = "";
	}

	let indexCssContent: string;

	try {
		indexCssContent = readFileSync(indexCssPath, "utf8");
	} catch (_) {
		indexCssContent = "";
	}

	return {
		publicDir,
		indexHtmlPath,
		indexJsPath,
		indexCssPath,
		indexHtmlContent,
		indexJsContent,
		indexCssContent,
	};
};
