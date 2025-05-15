export const DEFAULT_REQUEST_HOST = "localhost";

export const DEFAULT_REQUEST_METHOD = "GET";

export const DEFAULT_RESPONSE_CODE = 200;

export const DEFAULT_RESPONSE_HEADERS = {
	"Content-Type": "text/event-stream",
	"Cache-Control":
		"private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
	Connection: "keep-alive",
	Pragma: "no-cache",
	"X-Accel-Buffering": "no",
};

/**
 * Connection-specific headers that must be removed from the response when using HTTP/2.
 *
 * All lowercased.
 *
 * @see https://httpwg.org/specs/rfc9113.html#ConnectionSpecific
 */
export const CONNECTION_SPECIFIC_HEADERS = [
	"connection",
	"keep-alive",
	"proxy-connection",
	"keep-alive",
	"transfer-encoding",
	"upgrade",
	"te",
];
