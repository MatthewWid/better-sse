import type {SessionOptions} from "../Session";

/**
 * Represents the full request and response of an underlying network connection,
 * abstracting away the differences between the Node HTTP/1, HTTP/2, Fetch and
 * any other APIs.
 *
 * You can implement your own custom `Connection` subclass to make Better SSE
 * compatible with any framework.
 */
abstract class Connection {
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
	abstract sendHead: () => void;

	/**
	 * Write a chunk of data to the socket.
	 *
	 * You should encode the data to UTF-8 beforehand.
	 */
	abstract sendChunk: (chunk: string) => void;

	/**
	 * Perform any necessary cleanup after the connection is closed.
	 */
	abstract cleanup(): void;
}

interface ConnectionOptions
	extends Pick<SessionOptions, "statusCode" | "headers"> {}

export type {ConnectionOptions};
export {Connection};
