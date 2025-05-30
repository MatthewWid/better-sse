type SanitizerFunction = (text: string) => string;

const newlineVariantsRegex = /(\r\n|\r|\n)/g;

const newlineTrailingRegex = /\n+$/g;

const sanitize: SanitizerFunction = (text) => {
	let sanitized = text;

	// Standardize newlines
	sanitized = sanitized.replace(newlineVariantsRegex, "\n");

	// Strip trailing newlines
	sanitized = sanitized.replace(newlineTrailingRegex, "");

	return sanitized;
};

export type {SanitizerFunction};
export {sanitize};
