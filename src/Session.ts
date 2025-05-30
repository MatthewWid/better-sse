import {
	IncomingMessage as Http1ServerRequest,
	ServerResponse as Http1ServerResponse,
} from "node:http";
import {Http2ServerRequest, Http2ServerResponse} from "node:http2";
import {setImmediate} from "node:timers";
import {EventBuffer, type EventBufferOptions} from "./EventBuffer";
import type {Connection} from "./adapters/Connection";
import {FetchConnection} from "./adapters/FetchConnection";
import {NodeHttp1Connection} from "./adapters/NodeHttp1Connection";
import {NodeHttp2CompatConnection} from "./adapters/NodeHttp2CompatConnection";
import {SseError} from "./utils/SseError";
import {type EventMap, TypedEmitter} from "./utils/TypedEmitter";
import {applyHeaders} from "./utils/applyHeaders";
import {
	type PushFromIterable,
	createPushFromIterable,
} from "./utils/createPushFromIterable";
import {
	type PushFromStream,
	createPushFromStream,
} from "./utils/createPushFromStream";
import {
	type SanitizerFunction,
	sanitize as defaultSanitizer,
} from "./utils/sanitize";
import {
	type SerializerFunction,
	serialize as defaultSerializer,
} from "./utils/serialize";

interface SessionOptions<State = DefaultSessionState>
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
	headers?: Record<string, string | string[] | undefined>;

	/**
	 * Custom state for this session.
	 *
	 * Use this object to safely store information related to the session and user.
	 */
	state?: State;
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
 * It emits the `connected` event after it has connected and sent the response head to the client.
 * It emits the `disconnected` event after the connection has been closed.
 *
 * When using the Fetch API, the session is considered connected only once the `ReadableStream` contained in the body
 * of the `Response` returned by `getResponse` has began being consumed.
 *
 * When using the Node HTTP APIs, the session will send the response with status code, headers and other preamble data ahead of time,
 * allowing the session to connect and start pushing events immediately. As such, keep in mind that attempting
 * to write additional headers after the session has been created will result in an error being thrown.
 *
 * @param req - The Node HTTP/1 {@link https://nodejs.org/api/http.html#http_class_http_incomingmessage | ServerResponse}, HTTP/2 {@link https://nodejs.org/api/http2.html#class-http2http2serverrequest | Http2ServerRequest} or the Fetch API {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request} object.
 * @param res - The Node HTTP {@link https://nodejs.org/api/http.html#http_class_http_serverresponse | IncomingMessage}, HTTP/2 {@link https://nodejs.org/api/http2.html#class-http2http2serverresponse | Http2ServerResponse} or the Fetch API {@link https://developer.mozilla.org/en-US/docs/Web/API/Response | Response} object. Optional if using the Fetch API.
 * @param options - Optional additional configuration for the session.
 */
class Session<State = DefaultSessionState> extends TypedEmitter<SessionEvents> {
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
	state: State;

	private buffer: EventBuffer;
	private connection: Connection;
	private sanitize: SanitizerFunction;
	private serialize: SerializerFunction;
	private initialRetry: number | null;
	private keepAliveInterval: number | null;
	private keepAliveTimer?: ReturnType<typeof setInterval>;

	constructor(
		req: Http1ServerRequest,
		res: Http1ServerResponse,
		options?: SessionOptions<State>
	);
	constructor(
		req: Http2ServerRequest,
		res: Http2ServerResponse,
		options?: SessionOptions<State>
	);
	constructor(req: Request, res?: Response, options?: SessionOptions<State>);
	constructor(req: Request, options?: SessionOptions<State>);
	constructor(
		req: Http1ServerRequest | Http2ServerRequest | Request,
		res?:
			| Http1ServerResponse
			| Http2ServerResponse
			| Response
			| SessionOptions<State>,
		options?: SessionOptions<State>
	) {
		super();

		let givenOptions = options ?? {};

		if (req instanceof Request) {
			let givenRes: Response | null = null;

			if (res) {
				if (res instanceof Response) {
					givenRes = res;
				} else {
					if (options) {
						throw new SseError(
							"When providing a Fetch Request object but no Response object, " +
								"you may pass options as the second OR third argument " +
								"to the session constructor, but not to both."
						);
					}

					givenOptions = res;
				}
			}

			this.connection = new FetchConnection(req, givenRes, givenOptions);
		} else if (req instanceof Http1ServerRequest) {
			if (res instanceof Http1ServerResponse) {
				this.connection = new NodeHttp1Connection(req, res, givenOptions);
			} else {
				throw new SseError(
					"When providing a Node IncomingMessage object, " +
						"a corresponding ServerResponse object must also be provided."
				);
			}
		} else if (req instanceof Http2ServerRequest) {
			if (res instanceof Http2ServerResponse) {
				this.connection = new NodeHttp2CompatConnection(req, res, givenOptions);
			} else {
				throw new SseError(
					"When providing a Node HTTP2ServerRequest object, " +
						"a corresponding HTTP2ServerResponse object must also be provided."
				);
			}
		} else {
			throw new SseError(
				"Malformed request or response objects given to session constructor. " +
					"Must be one of IncomingMessage/ServerResponse from the Node HTTP/1 API, " +
					"HTTP2ServerRequest/HTTP2ServerResponse from the Node HTTP/2 Compatibility API, " +
					"or Request/Response from the Fetch API."
			);
		}

		if (givenOptions.headers) {
			applyHeaders(givenOptions.headers, this.connection.response.headers);
		}

		if (givenOptions.trustClientEventId !== false) {
			this.lastId =
				this.connection.request.headers.get("last-event-id") ??
				this.connection.url.searchParams.get("lastEventId") ??
				this.connection.url.searchParams.get("evs_last_event_id") ??
				"";
		}

		this.state = givenOptions.state ?? ({} as State);

		this.initialRetry =
			givenOptions.retry === null ? null : (givenOptions.retry ?? 2000);

		this.keepAliveInterval =
			givenOptions.keepAlive === null
				? null
				: (givenOptions.keepAlive ?? 10000);

		this.serialize = givenOptions.serializer ?? defaultSerializer;

		this.sanitize = givenOptions.sanitizer ?? defaultSanitizer;

		this.buffer = new EventBuffer({
			serializer: this.serialize,
			sanitizer: this.sanitize,
		});

		this.connection.request.signal.addEventListener(
			"abort",
			this.onDisconnected
		);

		setImmediate(this.initialize);
	}

	private initialize = () => {
		this.connection.sendHead();

		if (this.connection.url.searchParams.has("padding")) {
			this.buffer.comment(" ".repeat(2049)).dispatch();
		}

		if (this.connection.url.searchParams.has("evs_preamble")) {
			this.buffer.comment(" ".repeat(2056)).dispatch();
		}

		if (this.initialRetry !== null) {
			this.buffer.retry(this.initialRetry).dispatch();
		}

		this.flush();

		if (this.keepAliveInterval !== null) {
			this.keepAliveTimer = setInterval(this.keepAlive, this.keepAliveInterval);
		}

		this.isConnected = true;

		this.emit("connected");
	};

	private onDisconnected = () => {
		this.connection.request.signal.removeEventListener(
			"abort",
			this.onDisconnected
		);

		this.connection.cleanup();

		if (this.keepAliveTimer) {
			clearInterval(this.keepAliveTimer);
		}

		this.isConnected = false;

		this.emit("disconnected");
	};

	/**
	 * Write an empty comment and flush it to the client.
	 */
	private keepAlive = () => {
		this.buffer.comment().dispatch();
		this.flush();
	};

	/**
	 * Flush the contents of the internal buffer to the client and clear the buffer.
	 */
	private flush = () => {
		const contents = this.buffer.read();

		this.buffer.clear();

		this.connection.sendChunk(contents);
	};

	/**
	 * Get a Request object representing the request of the underlying connection this session manages.
	 *
	 * When using the Fetch API, this will be the original Request object passed to the session constructor.
	 *
	 * When using the Node HTTP APIs, this will be a new Request object with status code and headers copied from the original request.
	 * When the originally given request or response is closed, the abort signal attached to this Request will be triggered.
	 */
	getRequest = () => this.connection.request;

	/**
	 * Get a Response object representing the response of the underlying connection this session manages.
	 *
	 * When using the Fetch API, this will be a new Response object with status code and headers copied from the original response if given.
	 * Its body will be a ReadableStream that should begin being consumed for the session to consider itself connected.
	 *
	 * When using the Node HTTP APIs, this will be a new Response object with status code and headers copied from the original response.
	 * Its body will be `null`, as data is instead written to the stream of the originally given response object.
	 */
	getResponse = () => this.connection.response;

	/**
	 * Push an event to the client.
	 *
	 * If no event name is given, the event name is set to `"message"`.
	 *
	 * If no event ID is given, the event ID (and thus the `lastId` property) is set to a randomly generated UUIDv4.
	 *
	 * If the session has disconnected, an `SseError` will be thrown.
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
		eventId: string = crypto.randomUUID()
	): this => {
		if (!this.isConnected) {
			throw new SseError(
				"Cannot push data to a non-active session. " +
					"Ensure the session is connected before attempting to push events. " +
					"If using the Fetch API, the response stream " +
					"must begin being consumed before the session is considered connected."
			);
		}

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
	 * @returns A promise that resolves with `true` or rejects based on the success of the stream write finishing.
	 */
	stream: PushFromStream = createPushFromStream(this.push);

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
	iterate: PushFromIterable = createPushFromIterable(this.push);

	/**
	 * Batch and send multiple events at once.
	 *
	 * If given an `EventBuffer` instance, its contents will be sent to the client.
	 *
	 * If given a callback, it will be passed an instance of `EventBuffer` which uses the same serializer and sanitizer as the session.
	 * Once its execution completes - or once it resolves if it returns a promise - the contents of the passed `EventBuffer` will be sent to the client.
	 *
	 * @param batcher - Event buffer to get contents from, or callback that takes an event buffer to write to.
	 *
	 * @returns A promise that resolves once all data from the event buffer has been successfully sent to the client.
	 *
	 * @see EventBuffer
	 */
	batch = async (
		batcher: EventBuffer | ((buffer: EventBuffer) => void | Promise<void>)
	): Promise<void> => {
		if (batcher instanceof EventBuffer) {
			this.connection.sendChunk(batcher.read());
		} else {
			const buffer = new EventBuffer({
				serializer: this.serialize,
				sanitizer: this.sanitize,
			});

			await batcher(buffer);

			this.connection.sendChunk(buffer.read());
		}
	};
}

export type {SessionOptions, SessionEvents, DefaultSessionState};
export {Session};
