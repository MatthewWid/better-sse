import type {Http2ServerRequest, Http2ServerResponse} from "node:http2";
import {
	CONNECTION_SPECIFIC_HEADERS,
	DEFAULT_REQUEST_HOST,
	DEFAULT_REQUEST_METHOD,
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../lib/constants";
import type {Connection, ConnectionOptions} from "./Connection";

class NodeHttp2CompatConnection implements Connection {
	private controller: AbortController;

	request: Request;
	response: Response;
	url: URL;

	constructor(
		private req: Http2ServerRequest,
		private res: Http2ServerResponse,
		options: ConnectionOptions = {}
	) {
		this.url = new URL(
			`http://${req.headers.host ?? DEFAULT_REQUEST_HOST}${req.url}`
		);

		const method = req.method ?? DEFAULT_REQUEST_METHOD;

		const headers = new Headers();

		for (const [name, value] of Object.entries(req.headers)) {
			if (
				CONNECTION_SPECIFIC_HEADERS.includes(name.toLowerCase()) ||
				name.startsWith(":") ||
				!value
			) {
				continue;
			}

			if (Array.isArray(value)) {
				for (const item of value) {
					headers.append(name, item);
				}
			} else {
				headers.append(name, value);
			}
		}

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
			headers: {
				...DEFAULT_RESPONSE_HEADERS,
				...(res.getHeaders() as Record<string, string | string[] | undefined>),
			},
		});
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

export {NodeHttp2CompatConnection};
