import {Readable} from "node:stream";
import {vi, it, expect, beforeEach, type Mock} from "vitest";
import {createPushFromStream} from "./createPushFromStream";

const data = [1, 2, 3];
let push: Mock<[unknown, string]>;
let func: ReturnType<typeof createPushFromStream>;
let stream: Readable;

beforeEach(() => {
	push = vi.fn();
	func = createPushFromStream(push);
	stream = Readable.from(data);
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

	const stream = Readable.from(buffersToWrite);

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

	const stream = new Readable({
		read() {
			this.destroy(error);
		},
	});

	await expect(func(stream)).rejects.toThrow(error);
});
