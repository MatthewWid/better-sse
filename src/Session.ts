import serialize, {SerializerFunction} from "./lib/serialize";
import sanitize, {SanitizerFunction} from "./lib/sanitize";

export interface SessionOptions {
	serializer?: SerializerFunction;
	sanitizer?: SanitizerFunction;
}

/**
 * A Session represents an open connection between the server and the client.
 *
 * It is a general implementation that is then extended by adapters that implement the logic needed to interface with any given framework.
 *
 * Once extended via an adapter, a middleware can call upon the subclassed Session which then performs the program logic that is made compatible with the framework.
 */
abstract class Session {
	private serialize: SerializerFunction;
	private sanitize: SanitizerFunction;

	constructor(options: SessionOptions = {}) {
		this.serialize = options.serializer ?? serialize;
		this.sanitize = options.sanitizer ?? sanitize;
	}

	/**
	 * Write 200 OK and all given headers to the response WITHOUT ending the response.
	 */
	protected abstract writeAndFlushHeaders(headers: {
		[header: string]: string;
	}): void;

	/**
	 * Write a chunk of data to the response body WITHOUT ending the response.
	 */
	protected abstract writeBodyChunk(chunk: string): void;

	/**
	 * Call when a request has been received from the client and the response is ready to be written to.
	 */
	onConnect(): void {
		this.writeAndFlushHeaders({
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		});
	}

	/**
	 * Write a line with a field key and value appended with a newline character.
	 */
	writeField(name: string, value: string): void {
		const sanitized = sanitize(value);

		const text = `${name}: ${sanitized}\n`;

		this.writeBodyChunk(text);
	}

	/**
	 * Flush the buffered data to the client by writing an additional newline.
	 */
	dispatch(): void {
		this.writeBodyChunk("\n");
	}

	/**
	 * Write an event with the given name/type.
	 */
	event(type: string): void {
		this.writeField("event", type);
	}
}

export default Session;
