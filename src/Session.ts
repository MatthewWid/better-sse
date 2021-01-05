import {randomBytes} from "crypto";
import serialize, {SerializerFunction} from "./lib/serialize";
import sanitize, {SanitizerFunction} from "./lib/sanitize";

export interface SessionOptions {
	/**
	 * Serialize data to a string. By default data is serialized using `JSON.stringify`.
	 *
	 * Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.
	 */
	serializer?: SerializerFunction;
	/**
	 * Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertantly contains newlines.
	 *
	 * By default CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.
	 */
	sanitizer?: SanitizerFunction;
	/**
	 * Whether to trust the last event ID given by the client in the `Last-Event-ID` request header.
	 *
	 * When set to `false`, the `lastId` property will always be initialized to an empty string.
	 */
	trustClientEventId?: boolean;
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
	lastId = "";

	private serialize: SerializerFunction;
	private sanitize: SanitizerFunction;
	private trustClientEventId: boolean;

	constructor(options: SessionOptions = {}) {
		this.serialize = options.serializer ?? serialize;
		this.sanitize = options.sanitizer ?? sanitize;
		this.trustClientEventId = options.trustClientEventId ?? true;
	}

	/**
	 * Write 200 OK and all given headers to the response WITHOUT ending the response.
	 */
	protected abstract writeAndFlushHeaders(headers: {
		[header: string]: string;
	}): void;

	/**
	 * Retrieve the value of any arbitrary request header. If no such header exists on the request payload, return an empty string.
	 */
	protected abstract readHeader(name: string): string;

	/**
	 * Write a chunk of data to the response body WITHOUT ending the response.
	 */
	protected abstract writeBodyChunk(chunk: string): void;

	/**
	 * *This should only be called by adapters and their respective middlewares, not by the user.*
	 *
	 * Call when a request has been received from the client and the response is ready to be written to.
	 */
	onConnect = (): this => {
		if (this.trustClientEventId) {
			this.lastId = this.readHeader("Last-Event-ID");
		}

		this.writeAndFlushHeaders({
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		});

		return this;
	};

	/**
	 * *This should only be called by adapters and their respective middlewares, not by the user.*
	 *
	 * Call when a resonse has been fully sent and the request/response cycle has concluded.
	 */
	onDisconnect = (): this => {
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
	 * Set the event to the given name (also referred to as "type" in the specification).
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
	 * Set the event ID to the given string.
	 *
	 * Passing `null` will set the event ID to an empty string value.
	 */
	id = (id: string | null): this => {
		const stringifed = id ? id : "";

		this.writeField("id", stringifed);

		this.lastId = stringifed;

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
	 * This is equivalent to calling `.event()`, `.id()`, `.data()` and `.dispatch()` in that order.
	 *
	 * If no event name is given, the event name (type) is set to `"message"`.
	 *
	 * Note that this sets the event ID (and thus the `lastId` property) to a string of eight random characters (`a-z0-9`).
	 */
	push = (eventOrData: string | unknown, data?: unknown): this => {
		let eventName;
		let rawData;

		if (eventOrData && typeof data === "undefined") {
			eventName = "message";
			rawData = eventOrData;
		} else {
			eventName = (eventOrData as string).toString();
			rawData = data;
		}

		const nextId = randomBytes(4).toString("hex");

		this.event(eventName).id(nextId).data(rawData).dispatch();

		return this;
	};
}

export default Session;
