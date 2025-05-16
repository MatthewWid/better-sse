import type {IncomingMessage, ServerResponse} from "node:http";
import {applyHeaders} from "../lib/applyHeaders";
import {
	DEFAULT_REQUEST_HOST,
	DEFAULT_REQUEST_METHOD,
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../lib/constants";
import type {Connection, ConnectionOptions} from "./Connection";

class NodeHttp1Connection implements Connection {
	private controller: AbortController;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		private req: IncomingMessage,
		private res: ServerResponse,
		options: ConnectionOptions = {}
	) {
		this.url = new URL(
			`http://${req.headers.host ?? DEFAULT_REQUEST_HOST}${req.url}`
		);

		const method = req.method ?? DEFAULT_REQUEST_METHOD;

		const headers = new Headers();

		applyHeaders(req.headers, headers);

		this.controller = new AbortController();

		req.once("close", this.onClose);
		res.once("close", this.onClose);

		this.request = new Request(this.url, {
			method,
			headers,
			signal: this.controller.signal,
		});

		this.response = new Response(null, {
			status: options.statusCode ?? res.statusCode ?? DEFAULT_RESPONSE_CODE,
			headers: DEFAULT_RESPONSE_HEADERS,
		});

		if (res) {
			applyHeaders(
				res.getHeaders() as Record<string, string | string[] | undefined>,
				this.response.headers
			);
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
