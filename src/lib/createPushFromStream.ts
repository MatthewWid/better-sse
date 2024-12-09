import type {Readable} from "stream";

interface StreamOptions {
	/**
	 * Event name/type to be emitted when stream data is sent to the client.
	 *
	 * Defaults to `"stream"`.
	 */
	eventName?: string;
}

const createPushFromStream =
	(push: (data: unknown, eventName: string) => void) =>
	async (stream: Readable, options: StreamOptions = {}): Promise<boolean> => {
		const {eventName = "stream"} = options;

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
	};

export type {StreamOptions};
export {createPushFromStream};
