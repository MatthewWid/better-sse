import {vi, describe, it, expect} from "vitest";
import {EventBuffer} from "./EventBuffer";

describe("serializer", () => {
	it("can override the data serializer", () => {
		const buffer = new EventBuffer({
			serializer: (value) => `${JSON.stringify(value)}123`,
		});

		buffer.data("test-data");

		expect(buffer.read()).toBe('data:"test-data"123\n');
	});
});

describe("sanitizer", () => {
	it("can override the field value sanitizer", () => {
		const buffer = new EventBuffer({
			sanitizer: () => "sanitized",
		});

		buffer.data("test-data");

		expect(buffer.read()).toBe("data:sanitized\n");
	});

	it("sanitizes all fields with custom-given values", () => {
		const sanitizer = vi.fn();

		const buffer = new EventBuffer({sanitizer});

		buffer
			.event("test-event")
			.data("test-data")
			.id("test-data")
			.retry(999)
			.comment("test-comment");

		expect(sanitizer).toHaveBeenCalledTimes(5);
	});
});

describe("event", () => {
	it("can imperatively set the event type", () => {
		const eventType = "test";

		const buffer = new EventBuffer();

		buffer.event(eventType);

		expect(buffer.read()).toBe(`event:${eventType}\n`);
	});
});

describe("data", () => {
	it("can imperatively write data", () => {
		const dataToWrite = "test";

		const buffer = new EventBuffer();

		buffer.data(dataToWrite);

		expect(buffer.read()).toBe(`data:"${dataToWrite}"\n`);
	});

	it("serializes data as json", () => {
		const buffer = new EventBuffer();

		buffer.data({hello: "world"});

		expect(buffer.read()).toBe('data:{"hello":"world"}\n');
	});
});

describe("id", () => {
	it("can imperatively set the event ID", () => {
		const id = "12345678";

		const buffer = new EventBuffer();

		buffer.id(id);

		expect(buffer.read()).toBe(`id:${id}\n`);
	});
});

describe("retry", () => {
	it("can imperatively set the retry time", () => {
		const retry = 8000;

		const buffer = new EventBuffer();

		buffer.retry(retry);

		expect(buffer.read()).toBe(`retry:${retry}\n`);
	});
});

describe("comment", () => {
	it("can imperatively write a comment", () => {
		const comment = "test";

		const buffer = new EventBuffer();

		buffer.comment(comment);

		expect(buffer.read()).toBe(`:${comment}\n`);
	});

	it("can write a comment with no value", () => {
		const buffer = new EventBuffer();

		buffer.comment();

		expect(buffer.read()).toBe(":\n");
	});
});

describe("dispatch", () => {
	it("writes a newline when calling dispatch", () => {
		const buffer = new EventBuffer();

		buffer.dispatch();

		expect(buffer.read()).toBe("\n");
	});
});

describe("push", () => {
	it("calls all field writing methods with the given data, type and id", () => {
		const eventType = "test-type";
		const eventData = "test-data";
		const eventId = "test-id";

		const buffer = new EventBuffer();

		const event = vi.spyOn(buffer, "event");
		const data = vi.spyOn(buffer, "data");
		const id = vi.spyOn(buffer, "id");
		const dispatch = vi.spyOn(buffer, "dispatch");

		buffer.push(eventData, eventType, eventId);

		expect(event).toHaveBeenCalledWith(eventType);
		expect(data).toHaveBeenCalledWith(eventData);
		expect(id).toHaveBeenCalledWith(eventId);
		expect(dispatch).toHaveBeenCalled();
	});
});

describe("clear", () => {
	it("can clear the buffer contents", () => {
		const buffer = new EventBuffer();

		buffer.event("test-event").id("test-id").data("test-data").dispatch();

		expect(buffer.read()).not.toBe("");

		buffer.clear();

		expect(buffer.read()).toBe("");
	});
});

describe("read", () => {
	it("can get the buffer contents", () => {
		const buffer = new EventBuffer();

		expect(buffer.read()).toBe("");

		buffer.event("test-event");

		expect(buffer.read()).toBe("event:test-event\n");
	});
});
