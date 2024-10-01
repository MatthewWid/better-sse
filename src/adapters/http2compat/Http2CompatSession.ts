import {
	Http2ServerRequest,
	Http2ServerResponse,
	OutgoingHttpHeaders,
} from "http2";
import {DefaultSessionState, Session} from "../../Session";

class Http2CompatSession<State = DefaultSessionState> extends Session<State> {
	private params: URLSearchParams;

	constructor(
		private req: Http2ServerRequest,
		private res: Http2ServerResponse,
		...args: ConstructorParameters<typeof Session<State>>
	) {
		super(...args);

		req.once("close", this.onDisconnected);
		res.once("close", this.onDisconnected);

		const url = new URL(`http://localhost${req.url}`);
		this.params = url.searchParams;
	}

	protected onDisconnected() {
		this.req.removeListener("close", this.onDisconnected);
		this.res.removeListener("close", this.onDisconnected);

		super.onDisconnected();
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
		const value = this.req.headers[name];

		return Array.isArray(value) ? value.join(",") : value;
	}

	protected getParam(name: string): string | undefined {
		return this.params.get(name) ?? undefined;
	}

	protected sendHead(statusCode: number, headers: OutgoingHttpHeaders) {
		this.res.writeHead(statusCode, headers);
	}

	protected sendChunk(chunk: string) {
		this.res.write(chunk);
	}
}

export {Http2CompatSession};
