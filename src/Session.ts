import EventEmitter from "events";
import {IncomingMessage, ServerResponse, OutgoingHttpHeaders} from "http";
import serialize, {SerializerFunction} from "./lib/serialize";
import sanitize, {SanitizerFunction} from "./lib/sanitize";

export interface SessionOptions {
	/**
	 * Serialize data to a string that can be written.
	 *
	 * Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.
	 *
	 * Defaults to `JSON.stringify`.
	 */
	serializer?: SerializerFunction;

	/**
	 * Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.
	 *
	 * By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.
	 */
	sanitizer?: SanitizerFunction;

	/**
	 * Whether to trust the last event ID given by the client in the `Last-Event-ID` request header.
	 *
	 * When set to `false`, the `lastId` property will always be initialized to an empty string.
	 *
	 * Defaults to `true`.
	 */
	trustClientEventId?: boolean;

	/**
	 * Time in milliseconds for the client to wait before attempting to reconnect if the connection is closed. This is a request to the client browser, and does not guarantee that the client will actually respect the given time.
	 *
	 * This is equivalent to immediately calling `.retry().dispatch()` after a connection is made.
	 *
	 * Give as `null` to avoid sending an explicit reconnection time and allow the client browser to decide itself.
	 *
	 * Defaults to `2000` milliseconds.
	 *
	 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#concept-event-stream-reconnection-time
	 */
	retry?: number | null;

	/**
	 * Status code to be sent to the client.
	 *
	 * Event stream requests can be redirected using HTTP 301 and 307 status codes.
	 *
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

class Session extends EventEmitter {
	private req: IncomingMessage;
	private res: ServerResponse;

	private serialize: SerializerFunction;
	private sanitize: SanitizerFunction;
	private trustClientEventId: boolean;
	private initialRetry: number;
	private statusCode: number;
	private headers: OutgoingHttpHeaders;

	constructor(
		req: IncomingMessage,
		res: ServerResponse,
		options: SessionOptions = {}
	) {
		super();

		this.req = req;
		this.res = res;

		this.serialize = options.serializer ?? serialize;
		this.sanitize = options.sanitizer ?? sanitize;
		this.trustClientEventId = options.trustClientEventId ?? true;
		this.initialRetry = options.retry ?? 2000;
		this.statusCode = options.statusCode ?? 200;
		this.headers = options.headers ?? {};

		this.req.on("close", this.onDisconnected);
		this.res.on("close", this.onDisconnected);
		setImmediate(this.onConnected);
	}

	private onConnected = () => {
		this.res.setHeader("Content-Type", "text/event-stream");
		this.res.setHeader("Cache-Control", "no-cache, no-transform");
		this.res.setHeader("Connection", "keep-alive");
		this.res.flushHeaders();

		this.emit("connected");
	};

	private onDisconnected = () => {
		this.emit("disconnected");
	};
}

export default Session;
