import {
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../lib/constants";
import type {Connection, ConnectionOptions} from "./Connection";

class FetchConnection implements Connection {
	private static encoder = new TextEncoder();
	private writer: WritableStreamDefaultWriter;

	request: Request;
	response: Response;
	url: URL;

	constructor(
		request: Request,
		response?: Response | null,
		options: ConnectionOptions = {}
	) {
		this.request = request;

		const {readable, writable} = new TransformStream();

		this.writer = writable.getWriter();

		this.response = new Response(readable, {
			status: options.statusCode ?? response?.status ?? DEFAULT_RESPONSE_CODE,
			headers: {
				...DEFAULT_RESPONSE_HEADERS,
				...(response ? Object.fromEntries(response.headers) : {}),
			},
		});

		this.url = new URL(request.url);
	}

	sendHead = () => {
		// noop
	};

	sendChunk = (chunk: string) => {
		const encoded = FetchConnection.encoder.encode(chunk);
		this.writer.write(encoded);
	};

	cleanup = () => {
		this.writer.close();
	};
}

export {FetchConnection};
