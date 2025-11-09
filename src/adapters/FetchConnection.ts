import {
	DEFAULT_RESPONSE_CODE,
	DEFAULT_RESPONSE_HEADERS,
} from "../utils/constants";
import {Connection, type BuiltInConnectionOptions} from "./Connection";

class FetchConnection extends Connection {
	private static encoder = new TextEncoder();
	private writer: WritableStreamDefaultWriter;

	url: URL;
	request: Request;
	response: Response;

	constructor(
		request: Request,
		response: Response | null,
		options: BuiltInConnectionOptions = {}
	) {
		super();

		this.url = new URL(request.url);

		this.request = request;

		const {readable, writable} = new TransformStream();

		this.writer = writable.getWriter();

		this.response = new Response(readable, {
			status: options.statusCode ?? response?.status ?? DEFAULT_RESPONSE_CODE,
			headers: DEFAULT_RESPONSE_HEADERS,
		});

		if (response) {
			Connection.applyHeaders(response.headers, this.response.headers);
		}

		if (options.headers) {
			Connection.applyHeaders(options.headers, this.response.headers);
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
