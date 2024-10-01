import {
	IncomingMessage as Http1ServerRequest,
	ServerResponse as Http1ServerResponse,
	OutgoingHttpHeaders,
} from "http";
import {DefaultSessionState, Session} from "../../Session";

class Http1Session<State = DefaultSessionState> extends Session<State> {
	private params: URLSearchParams;

	constructor(
		private req: Http1ServerRequest,
		private res: Http1ServerResponse,
		...args: ConstructorParameters<typeof Session<State>>
	) {
		super(...args);

		req.once("close", this.onDisconnected);
		res.once("close", this.onDisconnected);

		const url = new URL(`http://localhost${req.url}`);
		this.params = url.searchParams;
	}

	protected onDisconnected = () => {
		this.req.removeListener("close", this.onDisconnected);
		this.res.removeListener("close", this.onDisconnected);

		super.onDisconnected();
	};

	protected getDefaultHeaders() {
		return {
			"Content-Type": "text/event-stream",
			"Cache-Control":
				"private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
			Connection: "keep-alive",
			Pragma: "no-cache",
			"X-Accel-Buffering": "no",
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

export {Http1Session};
