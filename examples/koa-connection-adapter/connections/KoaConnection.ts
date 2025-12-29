import {PassThrough} from "node:stream";
import {Connection} from "better-sse";
import type Koa from "koa";
import type {Context} from "koa";

class KoaConnection extends Connection {
	static addListeners = (app: Koa) => {
		app.on("error", (err, ctx?: Context) => {
			if (
				err.code === "ERR_STREAM_PREMATURE_CLOSE" &&
				ctx?.response.get("Content-Type") === "text/event-stream"
			) {
				return;
			}

			app.onerror(err);
		});
	};

	private controller: AbortController;
	private stream: PassThrough;

	url: URL;
	request: Request;
	response: Response;

	constructor(private ctx: Context) {
		super();

		this.url = ctx.URL;

		this.controller = new AbortController();

		this.request = new Request(this.url, {
			method: ctx.request.method ?? Connection.constants.REQUEST_METHOD,
			signal: this.controller.signal,
		});

		Connection.applyHeaders(ctx.headers, this.request.headers);

		ctx.status = Connection.constants.RESPONSE_CODE;
		ctx.set(Connection.constants.RESPONSE_HEADERS);

		this.response = new Response(null, {
			status: Connection.constants.RESPONSE_CODE,
			headers: Connection.constants.RESPONSE_HEADERS,
		});

		ctx.body = this.stream = new PassThrough();

		this.stream.once("close", this.onClose);
	}

	private onClose = () => {
		this.controller.abort();
	};

	sendHead = () => {
		this.ctx.flushHeaders();
	};

	sendChunk = (chunk: string) => {
		this.stream.write(chunk);
	};

	cleanup = () => {
		this.stream.removeListener("close", this.onClose);
	};
}

export {KoaConnection};
