interface IterateOptions {
	/**
	 * Event name/type to be emitted when iterable data is sent to the client.
	 *
	 * Defaults to `"iteration"`.
	 */
	eventName?: string;
}

type PushFromIterable = (
	iterable: Iterable<unknown> | AsyncIterable<unknown>,
	options?: IterateOptions
) => Promise<void>;

const createPushFromIterable =
	(push: (data: unknown, eventName: string) => void): PushFromIterable =>
	async (iterable, options = {}) => {
		const {eventName = "iteration"} = options;

		for await (const data of iterable) {
			push(data, eventName);
		}
	};

export type {IterateOptions, PushFromIterable};
export {createPushFromIterable};
