import {Readable as NodeReadableStream} from "node:stream";
import {beforeEach, describe, expect, it, type Mock, vi} from "vitest";
import {createPushFromStream} from "./createPushFromStream";

const data = [1, 2, 3];
let push: Mock<Parameters<typeof createPushFromStream>[0]>;
let func: ReturnType<typeof createPushFromStream>;

beforeEach(() => {
	push = vi.fn();
	func = createPushFromStream(push);
});

describe("Node stream.Readable", () => {
	let stream: NodeReadableStream;

	beforeEach(() => {
		stream = NodeReadableStream.from(data);
	});

	it("pipes each and every stream data emission as an event", async () => {
		await func(stream);

		expect(push).toHaveBeenCalledTimes(3);
		expect(push).toHaveBeenNthCalledWith(1, 1, "stream");
		expect(push).toHaveBeenNthCalledWith(2, 2, "stream");
		expect(push).toHaveBeenNthCalledWith(3, 3, "stream");
	});

	it("can override the event type in options", async () => {
		const eventName = "newEventName";

		await func(stream, {eventName});

		expect(push).toHaveBeenCalledWith(1, eventName);
	});

	it("serializes buffers as strings", async () => {
		const buffersToWrite = [
			Buffer.from([1, 2, 3]),
			Buffer.from([4, 5, 6]),
			Buffer.from([7, 8, 9]),
		];

		stream = NodeReadableStream.from(buffersToWrite);

		await func(stream);

		expect(push).toHaveBeenNthCalledWith(
			1,
			buffersToWrite[0].toString(),
			"stream"
		);
		expect(push).toHaveBeenNthCalledWith(
			2,
			buffersToWrite[1].toString(),
			"stream"
		);
		expect(push).toHaveBeenNthCalledWith(
			3,
			buffersToWrite[2].toString(),
			"stream"
		);
	});

	it("resolves with 'true' when stream finishes and is successful", async () => {
		const response = await func(stream);

		expect(response).toBeTruthy();
	});

	it("throws with the same error that the stream errors with", async () => {
		const error = new Error();

		stream = new NodeReadableStream({
			read() {
				this.destroy(error);
			},
		});

		await expect(func(stream)).rejects.toThrow(error);
	});
});

describe("Web ReadableStream", () => {
	let stream: ReadableStream;

	beforeEach(() => {
		stream = ReadableStream.from(data);
	});

	it("pipes each and every stream data emission as an event", async () => {
		await func(stream);

		expect(push).toHaveBeenCalledTimes(3);
		expect(push).toHaveBeenNthCalledWith(1, 1, "stream");
		expect(push).toHaveBeenNthCalledWith(2, 2, "stream");
		expect(push).toHaveBeenNthCalledWith(3, 3, "stream");
	});

	it("can override the event type in options", async () => {
		const eventName = "newEventName";

		await func(stream, {eventName});

		expect(push).toHaveBeenCalledWith(1, eventName);
	});

	it("serializes buffers as strings", async () => {
		const buffersToWrite = [
			Buffer.from([1, 2, 3]),
			Buffer.from([4, 5, 6]),
			Buffer.from([7, 8, 9]),
		];

		stream = ReadableStream.from(buffersToWrite);

		await func(stream);

		expect(push).toHaveBeenNthCalledWith(
			1,
			buffersToWrite[0].toString(),
			"stream"
		);
		expect(push).toHaveBeenNthCalledWith(
			2,
			buffersToWrite[1].toString(),
			"stream"
		);
		expect(push).toHaveBeenNthCalledWith(
			3,
			buffersToWrite[2].toString(),
			"stream"
		);
	});

	it("resolves with 'true' when stream finishes and is successful", async () => {
		const response = await func(stream);

		expect(response).toBeTruthy();
	});

	it("throws with the same error that the stream errors with", async () => {
		const error = new Error();

		stream = new ReadableStream({
			pull(controller) {
				controller.error(error);
			},
		});

		await expect(func(stream)).rejects.toThrow(error);
	});
});
