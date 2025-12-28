import type {SessionOptions} from "../Session";

const connectionConstants = Object.freeze({
	/**
	 * The default HTTP request method to apply to the `Connection#request` `status` property.
	 */
	REQUEST_METHOD: "GET",
	/**
	 * The default domain to apply to the `Connection#url` `host` proerty, typically overriden by the value of the `Host` header.
	 */
	REQUEST_HOST: "localhost",
	/**
	 * The default HTTP response status code to apply to the `Connection#response` `status` property.
	 */
	RESPONSE_CODE: 200,
	/**
	 * The default HTTP response headers to apply to the `Connection#response` `headers` property.
	 */
	RESPONSE_HEADERS: Object.freeze({
		"Content-Type": "text/event-stream",
		"Cache-Control":
			"private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
		Connection: "keep-alive",
		Pragma: "no-cache",
		"X-Accel-Buffering": "no",
	}),
});

type ConnectionConstants = typeof connectionConstants;

/**
 * Represents the full request and response of an underlying network connection,
 * abstracting away the differences between the Node HTTP/1, HTTP/2, Fetch and
 * any other APIs.
 *
 * You can implement your own custom `Connection` subclass to make Better SSE
 * compatible with any framework.
 */
abstract class Connection {
	/**
	 * Useful constants that you may use when implementing your own custom connection.
	 */
	static constants = connectionConstants;

	/**
	 * Utility method to consistently merge headers from an object into a `Headers` object.
	 *
	 * For each entry in `from`:
	 * - If the value is a `string`, it will replace the target header.
	 * - If the value is an `Array`, it will replace the target header and then append each item.
	 * - If the value is `undefined`, it will delete the target header.
	 */
	static applyHeaders(
		from: Record<string, string | string[] | undefined> | Headers,
		to: Headers
	) {
		const fromMap = from instanceof Headers ? Object.fromEntries(from) : from;

		for (const [key, value] of Object.entries(fromMap)) {
			if (Array.isArray(value)) {
				to.delete(key);

				for (const item of value) {
					to.append(key, item);
				}
			} else if (value === undefined) {
				to.delete(key);
			} else {
				to.set(key, value);
			}
		}
	}

	/**
	 * The URL used to open the connection to the server.
	 *
	 * For HTTP-based connections, this is typically constructured from the request `Host` header and URL path, including the query string.
	 *
	 * You should pass this to the constructor of the `Request` object stored in the `Connection#request` property.
	 */
	abstract url: URL;

	/**
	 * Represents the request that opened the connection.
	 *
	 * You should populate its `url` property - likely with the same value as the `url` property - its `method` and its `headers` properties.
	 *
	 * You should populate its `signal` property with an `AbortSignal` that gets triggered when the request *or* the response is closed, indicating to the session that the connection has disconnected.
	 */
	abstract request: Request;

	/**
	 * Represents the response that will be sent to the client.
	 *
	 * You should populate its `status` and `headers` properties.
	 *
	 * You *may* populate its `body` property with a `ReadableStream` that will enqueue any data written with the `sendChunk` method if you intend to use the session with a Fetch-based framework.
	 */
	abstract response: Response;

	/**
	 * Send the response head with status code and headers from the `response` instance.
	 */
	abstract sendHead(): void;

	/**
	 * Write a chunk of data to the socket.
	 *
	 * You should encode the data to UTF-8 beforehand.
	 */
	abstract sendChunk(chunk: string): void;

	/**
	 * Perform any necessary cleanup after the connection is closed.
	 */
	abstract cleanup(): void;
}

/**
 * Options passed from `Session` `options` argument to the built-in `Connection` implementations.
 */
interface BuiltInConnectionOptions
	extends Pick<SessionOptions, "statusCode" | "headers"> {}

export type {ConnectionConstants, BuiltInConnectionOptions};
export {Connection};
