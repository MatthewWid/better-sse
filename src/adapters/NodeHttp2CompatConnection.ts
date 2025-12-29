import type {Http2ServerRequest, Http2ServerResponse} from "node:http2";
import {type BuiltInConnectionOptions, Connection} from "./Connection";

class NodeHttp2CompatConnection extends Connection {
	private controller: AbortController;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		private req: Http2ServerRequest,
		private res: Http2ServerResponse,
		options: BuiltInConnectionOptions = {}
	) {
		super();

		req.socket.setNoDelay(true);
		res.socket?.setNoDelay(true);

		this.url = new URL(
			req.url ?? "/",
			`http://${req.headers.host ?? Connection.constants.REQUEST_HOST}`
		);

		this.controller = new AbortController();

		req.once("close", this.onClose);
		res.once("close", this.onClose);

		this.request = new Request(this.url, {
			method: req.method ?? Connection.constants.REQUEST_METHOD,
			signal: this.controller.signal,
		});

		const allowedHeaders = {...req.headers};

		for (const header of Object.keys(allowedHeaders)) {
			if (header.startsWith(":")) {
				delete allowedHeaders[header];
			}
		}

		Connection.applyHeaders(allowedHeaders, this.request.headers);

		this.response = new Response(null, {
			status:
				options.statusCode ??
				res.statusCode ??
				Connection.constants.RESPONSE_CODE,
			headers: Connection.constants.RESPONSE_HEADERS,
		});

		if (res) {
			Connection.applyHeaders(
				res.getHeaders() as Record<string, string | string[] | undefined>,
				this.response.headers
			);
		}

		if (options.headers) {
			Connection.applyHeaders(options.headers, this.response.headers);
		}
	}

	private onClose = () => {
		this.controller.abort();
	};

	sendHead = (): void => {
		this.res.writeHead(
			this.response.status,
			Object.fromEntries(this.response.headers)
		);
	};

	sendChunk = (chunk: string): void => {
		this.res.write(chunk);
	};

	cleanup = (): void => {
		this.req.removeListener("close", this.onClose);
		this.res.removeListener("close", this.onClose);
	};
}

export {NodeHttp2CompatConnection};
