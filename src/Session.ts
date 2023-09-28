import {
	IncomingMessage as Http1ServerRequest,
	ServerResponse as Http1ServerResponse,
	OutgoingHttpHeaders,
} from "http";
import {Http2ServerRequest, Http2ServerResponse} from "http2";
import {EventBuffer, EventBufferOptions} from "./EventBuffer";
import {TypedEmitter, EventMap} from "./lib/TypedEmitter";
import {generateId} from "./lib/generateId";
import {createPushFromStream} from "./lib/createPushFromStream";
import {createPushFromIterable} from "./lib/createPushFromIterable";

interface SessionOptions
	extends Pick<EventBufferOptions, "serializer" | "sanitizer"> {
	/**
	 * Whether to trust or ignore the last event ID given by the client in the `Last-Event-ID` request header.
	 *
	 * When set to `false`, the `lastId` property will always be initialized to an empty string.
	 *
	 * Defaults to `true`.
	 */
	trustClientEventId?: boolean;

	/**
	 * Time in milliseconds for the client to wait before attempting to reconnect if the connection is closed.
	 *
	 * This is a request to the client browser, and does not guarantee that the client will actually respect the given time.
	 *
	 * Equivalent to immediately calling `.retry().dispatch().flush()` after a connection is made.
	 *
	 * Give as `null` to avoid sending an explicit reconnection time and allow the client browser to decide itself.
	 *
	 * Defaults to `2000` milliseconds.
	 *
	 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#concept-event-stream-reconnection-time
	 */
	retry?: number | null;

	/**
	 * Time in milliseconds interval for the session to send a comment to keep the connection alive.
	 *
	 * Give as `null` to disable the connection keep-alive mechanism.
	 *
	 * Defaults to `10000` milliseconds (`10` seconds).
	 */
	keepAlive?: number | null;

	/**
	 * Status code to be sent to the client.
	 *
	 * Event stream requests can be redirected using HTTP 301 and 307 status codes.
	 * Make sure to set `Location` header when using these status codes using the `headers` property.
	 *
	 * A client can be asked to stop reconnecting by using 204 status code.
	 *
	 * Defaults to `200`.
	 */
	statusCode?: number;

	/**
	 * Additional headers to be sent along with the response.
	 */
	headers?: OutgoingHttpHeaders;
}

interface DefaultSessionState {
	[key: string]: unknown;
}

interface SessionEvents extends EventMap {
	connected: () => void;
	disconnected: () => void;
	push: (data: unknown, eventName: string, eventId: string) => void;
}

/**
 * A `Session` represents an open connection between the server and a client.
 *
 * It extends from the {@link https://nodejs.org/api/events.html#events_class_eventemitter | EventEmitter} class.
 *
 * It emits the `connected` event after it has connected and sent all headers to the client, and the
 * `disconnected` event after the connection has been closed.
 *
 * Note that creating a new session will immediately send the initial status code and headers to the client.
 * Attempting to write additional headers after you have created a new session will result in an error.
 *
 * @param req - The Node HTTP {@link https://nodejs.org/api/http.html#http_class_http_incomingmessage | ServerResponse} object.
 * @param res - The Node HTTP {@link https://nodejs.org/api/http.html#http_class_http_serverresponse | IncomingMessage} object.
 * @param options - Options given to the session instance.
 */
class Session<
	State extends Record<string, unknown> = DefaultSessionState
> extends TypedEmitter<SessionEvents> {
	/**
	 * The last event ID sent to the client.
	 *
	 * This is initialized to the last event ID given by the user, and otherwise is equal to the last number given to the `.id` method.
	 *
	 * For security reasons, keep in mind that the client can provide *any* initial ID here. Use the `trustClientEventId` constructor option to ignore the client-given initial ID.
	 *
	 * @readonly
	 */
	lastId = "";

	/**
	 * Indicates whether the session and underlying connection is open or not.
	 *
	 * @readonly
	 */
	isConnected = false;

	/**
	 * Custom state for this session.
	 *
	 * Use this object to safely store information related to the session and user.
	 *
	 * Use [module augmentation and declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)
	 * to safely add new properties to the `DefaultSessionState` interface.
	 */
	state = {} as State;

	private buffer: EventBuffer;

	/**
	 * Raw HTTP request.
	 */
	private req: Http1ServerRequest | Http2ServerRequest;

	/**
	 * Raw HTTP response that is the minimal interface needed and forms the
	 * intersection between the HTTP/1.1 and HTTP/2 server response interfaces.
	 */
	private res: {
		writeHead: (statusCode: number, headers: OutgoingHttpHeaders) => void;
		write: (chunk: string) => void;
	};

	private trustClientEventId: boolean;
	private initialRetry: number | null;
	private keepAliveInterval: number | null;
	private keepAliveTimer?: ReturnType<typeof setInterval>;
	private statusCode: number;
	private headers: OutgoingHttpHeaders;

	constructor(
		req: Http1ServerRequest | Http2ServerRequest,
		res: Http1ServerResponse | Http2ServerResponse,
		options: SessionOptions = {}
	) {
		super();

		this.req = req;

		this.res = res;

		this.buffer = new EventBuffer({
			serializer: options.serializer,
			sanitizer: options.sanitizer,
		});

		this.trustClientEventId = options.trustClientEventId ?? true;

		this.initialRetry =
			options.retry === null ? null : options.retry ?? 2000;

		this.keepAliveInterval =
			options.keepAlive === null ? null : options.keepAlive ?? 10000;

		this.statusCode = options.statusCode ?? 200;

		this.headers = options.headers ?? {};

		this.req.once("close", this.onDisconnected);

		setImmediate(this.initialize);
	}

	private initialize = () => {
		const url = `http://${this.req.headers.host}${this.req.url}`;
		const params = new URL(url).searchParams;

		if (this.trustClientEventId) {
			const givenLastEventId =
				this.req.headers["last-event-id"] ??
				params.get("lastEventId") ??
				params.get("evs_last_event_id") ??
				"";

			this.lastId = givenLastEventId as string;
		}

		const headers: OutgoingHttpHeaders = {};

		if (this.res instanceof Http1ServerResponse) {
			headers["Content-Type"] = "text/event-stream";
			headers["Cache-Control"] =
				"private, no-cache, no-store, no-transform, must-revalidate, max-age=0";
			headers["Connection"] = "keep-alive";
			headers["Pragma"] = "no-cache";
			headers["X-Accel-Buffering"] = "no";
		} else {
			headers["content-type"] = "text/event-stream";
			headers["cache-control"] =
				"private, no-cache, no-store, no-transform, must-revalidate, max-age=0";
			headers["pragma"] = "no-cache";
			headers["x-accel-buffering"] = "no";
		}

		for (const [name, value] of Object.entries(this.headers)) {
			headers[name] = value ?? "";
		}

		this.res.writeHead(this.statusCode, headers);

		if (params.has("padding")) {
			this.buffer.comment(" ".repeat(2049)).dispatch();
		}

		if (params.has("evs_preamble")) {
			this.buffer.comment(" ".repeat(2056)).dispatch();
		}

		if (this.initialRetry !== null) {
			this.buffer.retry(this.initialRetry).dispatch();
		}

		this.flush();

		if (this.keepAliveInterval !== null) {
			this.keepAliveTimer = setInterval(
				this.keepAlive,
				this.keepAliveInterval
			);
		}

		this.isConnected = true;

		this.emit("connected");
	};

	private onDisconnected = () => {
		if (this.keepAliveTimer) {
			clearInterval(this.keepAliveTimer);
		}

		this.isConnected = false;

		this.emit("disconnected");
	};

	private keepAlive = () => {
		this.buffer.comment().dispatch();
		this.flush();
	};

	/**
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	event(type: string): this {
		this.buffer.event(type);

		return this;
	}

	/**
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	data = (data: unknown): this => {
		this.buffer.data(data);

		return this;
	};

	/**
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	id = (id = ""): this => {
		this.buffer.id(id);

		this.lastId = id;

		return this;
	};

	/**
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	retry = (time: number): this => {
		this.buffer.retry(time);

		return this;
	};

	/**
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	comment = (text?: string): this => {
		this.buffer.comment(text);

		return this;
	};

	/**
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	dispatch = (): this => {
		this.buffer.dispatch();

		return this;
	};

	/**
	 * Flush the contents of the internal buffer to the client and clear the buffer.
	 *
	 * @deprecated see https://github.com/MatthewWid/better-sse/issues/52
	 */
	flush = (): this => {
		this.res.write(this.buffer.read());

		this.buffer.clear();

		return this;
	};

	/**
	 * Push an event to the client.
	 *
	 * If no event name is given, the event name is set to `"message"`.
	 *
	 * If no event ID is given, the event ID (and thus the `lastId` property) is set to a unique string generated using a cryptographic pseudorandom number generator.
	 *
	 * Emits the `push` event with the given data, event name and event ID in that order.
	 *
	 * @param data - Data to write.
	 * @param eventName - Event name to write.
	 * @param eventId - Event ID to write.
	 */
	push = (
		data: unknown,
		eventName = "message",
		eventId = generateId()
	): this => {
		this.buffer.push(data, eventName, eventId);

		this.flush();

		this.lastId = eventId;

		this.emit("push", data, eventName, eventId);

		return this;
	};

	/**
	 * Pipe readable stream data as a series of events to the client.
	 *
	 * This uses the `push` method under the hood.
	 *
	 * If no event name is given in the `options` object, the event name is set to `"stream"`.
	 *
	 * @param stream - Readable stream to consume data from.
	 * @param options - Options to alter how the stream is flushed to the client.
	 *
	 * @returns A promise that resolves or rejects based on the success of the stream write finishing.
	 */
	stream = createPushFromStream(this.push);

	/**
	 * Iterate over an iterable and send yielded values as events to the client.
	 *
	 * This uses the `push` method under the hood.
	 *
	 * If no event name is given in the `options` object, the event name is set to `"iteration"`.
	 *
	 * @param iterable - Iterable to consume data from.
	 *
	 * @returns A promise that resolves once all data has been successfully yielded from the iterable.
	 */
	iterate = createPushFromIterable(this.push);
}

export type {SessionOptions, SessionEvents, DefaultSessionState};
export {Session};
