import {
	ServerHttp2Stream,
	IncomingHttpHeaders,
	OutgoingHttpHeaders,
} from "http2";
import {DefaultSessionState, Session} from "../../Session";

class Http2Session<State = DefaultSessionState> extends Session<State> {
	private responseStream: ServerHttp2Stream;
	private incomingHeaders: IncomingHttpHeaders;
	private params: URLSearchParams;

	constructor(
		stream: ServerHttp2Stream,
		headers: IncomingHttpHeaders,
		...args: ConstructorParameters<typeof Session<State>>
	) {
		super(...args);

		this.responseStream = stream;
		this.incomingHeaders = headers;

		this.responseStream.on("close", this.onDisconnected);

		const url = new URL(`http://localhost${headers[":path"]}`);
		this.params = url.searchParams;
	}

	protected getDefaultHeaders() {
		return {
			"content-type": "text/event-stream",
			"cache-control":
				"private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
			pragma: "no-cache",
			"x-accel-buffering": "no",
		};
	}

	protected getHeader(name: string): string | undefined {
		const {[name]: value} = this.incomingHeaders;

		return Array.isArray(value) ? value.join(",") : value;
	}

	protected getParam(name: string): string | undefined {
		return this.params.get(name) ?? undefined;
	}

	protected sendHead(statusCode: number, headers: OutgoingHttpHeaders) {
		this.responseStream.respond({
			":status": statusCode,
			...headers,
		});
	}

	protected sendChunk(chunk: string) {
		this.responseStream.write(chunk);
	}
}

export {Http2Session};
