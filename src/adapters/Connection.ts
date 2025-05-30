import type {SessionOptions} from "../Session";

/**
 * Represents the full request and response of an underlying network connection,
 * abstracting away the differences between the Node HTTP API and the Fetch API.
 */
interface Connection {
	url: URL;
	request: Request;
	response: Response;

	/**
	 * Send the response head with status code and headers.
	 */
	sendHead: () => void;

	/**
	 * Write a chunk of data to the socket, optionally encoding to UTF-8 beforehand.
	 */
	sendChunk: (chunk: string) => void;

	/**
	 * Perform any necessary cleanup after the connection is closed.
	 */
	cleanup(): void;
}

interface ConnectionOptions extends Pick<SessionOptions, "statusCode"> {}

export type {Connection, ConnectionOptions};
