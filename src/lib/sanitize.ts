interface SanitizerFunction {
	(text: string): string;
}

const sanitize: SanitizerFunction = (text) => {
	let sanitized = text;

	// Standardize newlines
	sanitized = sanitized.replace(/(\r\n|\r|\n)/g, "\n");

	// Strip trailing newlines
	sanitized = sanitized.replace(/\n+$/g, "");

	return sanitized;
};

export type {SanitizerFunction};
export {sanitize};
