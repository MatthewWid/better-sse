import {type Mock, beforeEach, expect, it, vi} from "vitest";
import {createPushFromIterable} from "./createPushFromIterable";

const data = [1, 2, 3];
let push: Mock<[unknown, string]>;
let func: ReturnType<typeof createPushFromIterable>;

function* syncIterator() {
	for (let i = 0; i < data.length; i++) {
		yield data[i];
	}
}

async function* asyncIterator() {
	for (let i = 0; i < data.length; i++) {
		yield data[i];
	}
}

beforeEach(() => {
	push = vi.fn();
	func = createPushFromIterable(push);
});

it("sends each and every yielded value as an event for synchronous generators", async () => {
	await func(syncIterator());

	expect(push).toHaveBeenCalledTimes(3);
	expect(push).toHaveBeenNthCalledWith(1, data[0], "iteration");
	expect(push).toHaveBeenNthCalledWith(2, data[1], "iteration");
	expect(push).toHaveBeenNthCalledWith(3, data[2], "iteration");
});

it("sends each and every yielded value as an event for async generators", async () => {
	await func(asyncIterator());

	expect(push).toHaveBeenCalledTimes(3);
	expect(push).toHaveBeenNthCalledWith(1, data[0], "iteration");
	expect(push).toHaveBeenNthCalledWith(2, data[1], "iteration");
	expect(push).toHaveBeenNthCalledWith(3, data[2], "iteration");
});

it("can override the event type in options", async () => {
	const eventName = "test-event-name";

	await func(syncIterator(), {eventName});

	expect(push).toHaveBeenCalledWith(data[0], eventName);
});
