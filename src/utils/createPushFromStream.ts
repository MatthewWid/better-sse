import {Readable as NodeReadableStream} from "node:stream";

type WebReadableStream = ReadableStream;

interface StreamOptions {
	/**
	 * Event name/type to be emitted when stream data is sent to the client.
	 *
	 * Defaults to `"stream"`.
	 */
	eventName?: string;
}

type PushFromStream = (
	stream: NodeReadableStream | WebReadableStream,
	options?: StreamOptions
) => Promise<boolean>;

const createPushFromStream =
	(push: (data: unknown, eventName: string) => void): PushFromStream =>
	async (stream, options = {}) => {
		const {eventName = "stream"} = options;

		if (stream instanceof NodeReadableStream) {
			return await new Promise<boolean>((resolve, reject) => {
				stream.on("data", (chunk) => {
					let data: string;

					if (Buffer.isBuffer(chunk)) {
						data = chunk.toString();
					} else {
						data = chunk;
					}

					push(data, eventName);
				});

				stream.once("end", () => resolve(true));
				stream.once("close", () => resolve(true));
				stream.once("error", (err) => reject(err));
			});
		}

		for await (const chunk of stream) {
			if (Buffer.isBuffer(chunk)) {
				push(chunk.toString(), eventName);
			} else {
				push(chunk, eventName);
			}
		}

		return true;
	};

export type {StreamOptions, PushFromStream};
export {createPushFromStream};
