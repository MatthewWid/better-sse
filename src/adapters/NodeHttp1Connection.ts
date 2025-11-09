import type {IncomingMessage, ServerResponse} from "node:http";
import {type BuiltInConnectionOptions, Connection} from "./Connection";

class NodeHttp1Connection extends Connection {
	private controller: AbortController;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		private req: IncomingMessage,
		private res: ServerResponse,
		options: BuiltInConnectionOptions = {}
	) {
		super();

		this.url = new URL(
			`http://${req.headers.host ?? Connection.constants.REQUEST_HOST}${req.url}`
		);

		this.controller = new AbortController();

		req.once("close", this.onClose);
		res.once("close", this.onClose);

		this.request = new Request(this.url, {
			method: req.method ?? Connection.constants.REQUEST_METHOD,
			signal: this.controller.signal,
		});

		Connection.applyHeaders(req.headers, this.request.headers);

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

	sendHead = () => {
		this.res.writeHead(
			this.response.status,
			Object.fromEntries(this.response.headers)
		);
	};

	sendChunk = (chunk: string) => {
		this.res.write(chunk);
	};

	cleanup = () => {
		this.req.removeListener("close", this.onClose);
		this.res.removeListener("close", this.onClose);
	};
}

export {NodeHttp1Connection};
