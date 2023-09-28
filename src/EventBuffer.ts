import {serialize, SerializerFunction} from "./lib/serialize";
import {sanitize, SanitizerFunction} from "./lib/sanitize";
import {generateId} from "./lib/generateId";
import {createPushFromStream} from "./lib/createPushFromStream";
import {createPushFromIterable} from "./lib/createPushFromIterable";

interface EventBufferOptions {
	/**
	 * Serialize data to a string that can be written.
	 *
	 * Defaults to `JSON.stringify`.
	 */
	serializer?: SerializerFunction;

	/**
	 * Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.
	 *
	 * By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.
	 */
	sanitizer?: SanitizerFunction;
}

/**
 * An `EventBuffer` allows you to write raw spec-compliant SSE fields into a text buffer that can be sent directly over the wire.
 *
 * This is made available for users with more advanced use-cases who need to create an event text stream from scratch themselves. Most users will not need to access this directly and can use the simplified helper methods provided by the `Session` class instead.
 */
class EventBuffer {
	private buffer = "";
	private serialize: SerializerFunction;
	private sanitize: SanitizerFunction;

	constructor(options: EventBufferOptions = {}) {
		this.serialize = options.serializer ?? serialize;
		this.sanitize = options.sanitizer ?? sanitize;
	}

	/**
	 * Write a line with a field key and value appended with a newline character.
	 */
	private writeField = (name: string, value: string): this => {
		const sanitized = this.sanitize(value);

		this.buffer += name + ":" + sanitized + "\n";

		return this;
	};

	/**
	 * Write an event name field (also referred to as the event "type" in the specification).
	 *
	 * @param type - Event name/type.
	 */
	event(type: string): this {
		this.writeField("event", type);

		return this;
	}

	/**
	 * Write arbitrary data into a data field.
	 *
	 * Data is serialized to a string using the given `serializer` function option or JSON stringification by default.
	 *
	 * @param data - Data to serialize and write.
	 */
	data = (data: unknown): this => {
		const serialized = this.serialize(data);

		this.writeField("data", serialized);

		return this;
	};

	/**
	 * Write an event ID field.
	 *
	 * Defaults to an empty string if no argument is given.
	 *
	 * @param id - Identification string to write.
	 */
	id = (id = ""): this => {
		this.writeField("id", id);

		return this;
	};

	/**
	 * Write a retry field that suggests a reconnection time with the given milliseconds.
	 *
	 * @param time - Time in milliseconds to retry.
	 */
	retry = (time: number): this => {
		const stringifed = time.toString();

		this.writeField("retry", stringifed);

		return this;
	};

	/**
	 * Write a comment (an ignored field).
	 *
	 * This will not fire an event but is often used to keep the connection alive.
	 *
	 * @param text - Text of the comment. Otherwise writes an empty field value.
	 */
	comment = (text = ""): this => {
		this.writeField("", text);

		return this;
	};

	/**
	 * Indicate that the event has finished being created by writing an additional newline character.
	 */
	dispatch = (): this => {
		this.buffer += "\n";

		return this;
	};

	/**
	 * Create, write and dispatch an event with the given data to the client all at once.
	 *
	 * This is equivalent to calling the methods `event`, `id`, `data` and `dispatch` in that order.
	 *
	 * If no event name is given, the event name is set to `"message"`.
	 *
	 * If no event ID is given, the event ID is set to a unique string generated using a cryptographic pseudorandom number generator.
	 *
	 * @param data - Data to write.
	 * @param eventName - Event name to write.
	 * @param eventId - Event ID to write.
	 */
	push = (
		data: unknown,
		eventName = "message",
		eventId = generateId()
	): this => {
		this.event(eventName).id(eventId).data(data).dispatch();

		return this;
	};

	/**
	 * Pipe readable stream data as a series of events into the buffer.
	 *
	 * This uses the `push` method under the hood.
	 *
	 * If no event name is given in the `options` object, the event name is set to `"stream"`.
	 *
	 * @param stream - Readable stream to consume data from.
	 * @param options - Options to alter how the stream is flushed to the client.
	 *
	 * @returns A promise that resolves or rejects based on the success of the stream write finishing.
	 */
	stream = createPushFromStream(this.push);

	/**
	 * Iterate over an iterable and write yielded values as events into the buffer.
	 *
	 * This uses the `push` method under the hood.
	 *
	 * If no event name is given in the `options` object, the event name is set to `"iteration"`.
	 *
	 * @param iterable - Iterable to consume data from.
	 *
	 * @returns A promise that resolves once all data has been successfully yielded from the iterable.
	 */
	iterate = createPushFromIterable(this.push);

	/**
	 * Clear the contents of the buffer.
	 */
	clear = () => {
		this.buffer = "";

		return this;
	};

	/**
	 * Get a copy of the buffer contents.
	 */
	read = () => this.buffer;
}

export type {EventBufferOptions};
export {EventBuffer};
