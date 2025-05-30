import {applyHeaders} from "../utils/applyHeaders";
import {
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../utils/constants";
import type {Connection, ConnectionOptions} from "./Connection";

class FetchConnection implements Connection {
	private static encoder = new TextEncoder();
	private writer: WritableStreamDefaultWriter;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		request: Request,
		response: Response | null,
		options: ConnectionOptions = {}
	) {
		this.url = new URL(request.url);

		this.request = request;

		const {readable, writable} = new TransformStream();

		this.writer = writable.getWriter();

		this.response = new Response(readable, {
			status: options.statusCode ?? response?.status ?? DEFAULT_RESPONSE_CODE,
			headers: DEFAULT_RESPONSE_HEADERS,
		});

		if (response) {
			applyHeaders(response.headers, this.response.headers);
		}
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
