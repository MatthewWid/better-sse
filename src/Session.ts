import serialize, {SerializerFunction} from "./lib/serialize";

export interface SessionOptions {
	serializer?: SerializerFunction;
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

	constructor(options: SessionOptions = {}) {
		this.serialize = options.serializer ?? serialize;
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
}

export default Session;
