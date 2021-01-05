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
	/**
	 * The last ID sent to the client.
	 * This is initialized to the last event ID given by the user, and otherwise is equal to the last number given to the `.id` method.
	 */
	lastId = 0;

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
	onConnect = (): this => {
		this.writeAndFlushHeaders({
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		});

		return this;
	};

	/**
	 * Write a line with a field key and value appended with a newline character.
	 */
	private writeField = (name: string, value: string): this => {
		const sanitized = this.sanitize(value);

		const text = `${name}:${sanitized}\n`;

		this.writeBodyChunk(text);

		return this;
	};

	/**
	 * Flush the buffered data to the client by writing an additional newline.
	 */
	dispatch = (): this => {
		this.writeBodyChunk("\n");

		return this;
	};

	/**
	 * Set the event to the given name/type.
	 */
	event(type: string): this {
		this.writeField("event", type);

		return this;
	}

	/**
	 * Write arbitrary data onto the wire that is automatically serialized to a string using the given `serializer` function option or JSON stringification by default.
	 */
	data = (data: unknown): this => {
		const serialized = this.serialize(data);

		this.writeField("data", serialized);

		return this;
	};

	/**
	 * Set the event ID to the given number.
	 */
	id = (id: number): this => {
		const stringifed = id.toString();

		this.writeField("id", stringifed);

		this.lastId = id;

		return this;
	};

	/**
	 * Set the suggested reconnection time to the given milliseconds.
	 */
	retry = (time: number): this => {
		const stringifed = time.toString();

		this.writeField("retry", stringifed);

		return this;
	};

	/**
	 * Write a comment (an ignored field).
	 *
	 * This will not fire an event, but is often used to keep the connection alive.
	 */
	comment = (text: string): this => {
		this.writeField("", text);

		return this;
	};

	/**
	 * Create and dispatch an event with the given data all at once.
	 * This is equivalent to calling `.event()`, `.id()`, `.data()` and `.dispatch()` all at once.
	 */
	push = (eventOrData: string | unknown, data?: unknown): this => {
		let eventName;
		let rawData;

		if (eventOrData && typeof data === undefined) {
			eventName = "message";
			rawData = eventOrData;
		} else {
			eventName = (eventOrData as string).toString();
			rawData = data;
		}

		const nextId = this.lastId + 1;

		this.event(eventName).id(nextId).data(rawData).dispatch();

		return this;
	};
}

export default Session;
