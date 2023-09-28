interface IterateOptions {
	/**
	 * Event name/type to be emitted when iterable data is sent to the client.
	 *
	 * Defaults to `"iteration"`.
	 */
	eventName?: string;
}

const createPushFromIterable =
	(push: (data: unknown, eventName: string) => void) =>
	async <DataType = unknown>(
		iterable: Iterable<DataType> | AsyncIterable<DataType>,
		options: IterateOptions = {}
	): Promise<void> => {
		const {eventName = "iteration"} = options;

		for await (const data of iterable) {
			push(data, eventName);
		}
	};

export type {IterateOptions};
export {createPushFromIterable};
