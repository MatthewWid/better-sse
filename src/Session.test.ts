import http from "http";
import http2 from "http2";
import {AddressInfo} from "net";
import EventSource from "eventsource";
import {Readable} from "stream";
import {serialize, SerializerFunction} from "./lib/serialize";
import {SanitizerFunction} from "./lib/sanitize";
import {
	createHttpServer,
	closeServer,
	getUrl,
	waitForConnect,
	createHttp2Server,
} from "./lib/testUtils";
import {Session} from "./Session";

let server: http.Server;
let url: string;
let eventsource: EventSource;

beforeEach(async () => {
	server = await createHttpServer();

	url = getUrl(server);
});

afterEach(async () => {
	jest.useRealTimers();

	if (eventsource) {
		eventsource.close();
	}

	await closeServer(server);
});

describe("connection", () => {
	const defaultHeaders: http.OutgoingHttpHeaders = {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
	};

	it("constructs without errors when giving no options", (done) => {
		server.on("request", (req, res) => {
			expect(() => {
				new Session(req, res);
			}).not.toThrow();

			done();
		});

		eventsource = new EventSource(url);
	});

	it("fires the connection event non-synchronously after response headers are sent", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("fires the disconnection event when the client kills the connection", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				session.on("disconnected", () => {
					done();
				});
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("open", () => {
			eventsource.close();
		});
	});

	it("fires the disconnection event when the server closes the response stream", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("disconnected", () => {
				done();
			});

			session.on("connected", () => {
				res.end();
			});
		});

		eventsource = new EventSource(url);
	});

	it("sets the isConnected boolean based on whether the session is open or not", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			expect(session.isConnected).toBeFalsy();

			session.on("disconnected", () => {
				expect(session.isConnected).toBeFalsy();

				done();
			});

			session.on("connected", () => {
				expect(session.isConnected).toBeTruthy();

				res.end();
			});
		});

		eventsource = new EventSource(url);
	});

	it("returns the correct response status code and headers", (done) => {
		server.on("request", (req, res) => {
			const writeHead = jest.spyOn(res, "writeHead");

			const session = new Session(req, res);

			session.on("connected", () => {
				expect(writeHead).toHaveBeenCalledWith(200, defaultHeaders);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can set the status code in options", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res, {statusCode: 201});

			session.on("connected", () => {
				expect(res.statusCode).toBe(201);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can override the serializer function", (done) => {
		const serializer = jest.fn(
			(value: string) => `123${JSON.stringify(value)}123`
		) as jest.Mocked<SerializerFunction>;

		server.on("request", (req, res) => {
			const session = new Session(req, res, {serializer});

			session.on("connected", () => {
				session.push("Hello world");

				expect(serializer).toHaveBeenCalledWith("Hello world");
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("message", (event) => {
			expect(event.data).toBe('123"Hello world"123');

			done();
		});
	});

	it("can override the sanitizer function", (done) => {
		const sanitizer = jest.fn((value: string) =>
			value === serialize("Hello world") ? "sanitized" : value
		) as jest.Mocked<SanitizerFunction>;

		server.on("request", (req, res) => {
			const session = new Session(req, res, {sanitizer});

			session.on("connected", () => {
				session.push("Hello world");

				expect(sanitizer).toHaveBeenCalled();
				expect(sanitizer).toHaveBeenCalledWith(
					serialize("Hello world")
				);
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("message", (event) => {
			expect(event.data).toBe("sanitized");

			done();
		});
	});

	it("adds custom headers to the response headers", (done) => {
		const additionalHeaders = {
			"x-test-header-1": "123",
			"x-test-header-2": "456",
		};

		server.on("request", (req, res) => {
			const writeHead = jest.spyOn(res, "writeHead");

			const session = new Session(req, res, {
				headers: additionalHeaders,
			});

			session.on("connected", () => {
				const sentHeaders = writeHead.mock.calls[0][1];

				expect(sentHeaders).toMatchObject(additionalHeaders);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("sets custom headers without values to an empty string", (done) => {
		const additionalHeaders = {
			"x-test-header-1": undefined,
		};

		server.on("request", (req, res) => {
			const writeHead = jest.spyOn(res, "writeHead");

			const session = new Session(req, res, {
				headers: additionalHeaders,
			});

			session.on("connected", () => {
				const sentHeaders = writeHead.mock.calls[0][1];

				expect(sentHeaders).toMatchObject({
					"x-test-header-1": "",
				});

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("dispatch", () => {
	it("writes a newline when calling dispatch", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.dispatch();

				expect(write).toHaveBeenLastCalledWith("\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("retry", () => {
	it("writes an initial retry field by default", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				expect(write).toHaveBeenCalledTimes(2);
				expect(write).toHaveBeenCalledWith("retry:2000\n");
				expect(write).toHaveBeenCalledWith("\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can modify the initial retry field value", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res, {
				retry: 4000,
			});

			session.on("connected", () => {
				expect(write).toHaveBeenCalledWith("retry:4000\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can prevent the initial retry field from being sent", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res, {
				retry: null,
			});

			session.on("connected", () => {
				expect(write).not.toHaveBeenCalledWith("retry:2000\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can imperatively set the retry time", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res, {
				retry: null,
			});

			session.on("connected", () => {
				session.retry(8000);

				expect(write).toHaveBeenCalledWith("retry:8000\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("keep-alive", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	it("starts a keep-alive timer given no options", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				expect(setInterval).toHaveBeenCalledTimes(1);
				expect(setInterval).toHaveBeenCalledWith(
					expect.any(Function),
					10000
				);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can set the keep-alive interval in options", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res, {keepAlive: 1000});

			session.on("connected", () => {
				expect(setInterval).toHaveBeenCalledWith(
					expect.any(Function),
					1000
				);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can disable the keep-alive mechanism in options", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res, {keepAlive: null});

			session.on("connected", () => {
				expect(setInterval).not.toHaveBeenCalled();

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("sends a comment in intervals", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const comment = jest.spyOn(session, "comment");
			const dispatch = jest.spyOn(session, "dispatch");

			await waitForConnect(session);

			const lastDispatchCalls = dispatch.mock.calls.length;

			jest.runOnlyPendingTimers();

			expect(comment).toHaveBeenCalledWith();
			expect(comment).toHaveBeenCalledTimes(1);
			expect(dispatch).toHaveBeenCalledTimes(lastDispatchCalls + 1);

			done();
		});

		eventsource = new EventSource(url);
	});
});

describe("event ID management", () => {
	const givenLastId = "12345678";

	it("starts with an empty last event ID", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				expect(session.lastId).toBe("");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("trusts and stores the given last event ID by default", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				expect(session.lastId).toBe(givenLastId);

				done();
			});
		});

		eventsource = new EventSource(url, {
			headers: {"Last-Event-ID": givenLastId},
		});
	});

	it("ignores the given last event ID if set in options", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res, {
				trustClientEventId: false,
			});

			session.on("connected", () => {
				expect(session.lastId).toBe("");

				done();
			});
		});

		eventsource = new EventSource(url, {
			headers: {"Last-Event-ID": givenLastId},
		});
	});

	it("can imperatively set the event ID", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.id(givenLastId);

				expect(write).toHaveBeenLastCalledWith(`id:${givenLastId}\n`);
				expect(session.lastId).toBe(givenLastId);

				session.data(0).dispatch();
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("message", (event) => {
			expect(event.lastEventId).toBe(givenLastId);

			done();
		});
	});

	it("sets the event ID to an empty string when passed null", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.id();

				expect(write).toHaveBeenLastCalledWith("id:\n");
				expect(session.lastId).toBe("");

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("event type", () => {
	it("can imperatively set the event type", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.event("test");

				expect(write).toHaveBeenLastCalledWith("event:test\n");

				session.data(0);

				session.dispatch();
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("test", () => {
			done();
		});
	});
});

describe("data writing", () => {
	const dataToWrite = "test";

	it("can imperatively write data", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.data(dataToWrite);

				expect(write).toHaveBeenLastCalledWith(
					`data:"${dataToWrite}"\n`
				);

				session.dispatch();
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener(
			"message",
			(event: MessageEvent<string>) => {
				expect(event.data).toBe(`"${dataToWrite}"`);

				done();
			}
		);
	});

	it("serializes data written", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.data(dataToWrite);

				expect(write).toHaveBeenLastCalledWith(
					`data:${JSON.stringify(dataToWrite)}\n`
				);

				session.dispatch();
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener(
			"message",
			(event: MessageEvent<string>) => {
				expect(event.data).toBe(JSON.stringify(dataToWrite));

				done();
			}
		);
	});
});

describe("comments", () => {
	it("can imperatively write a field with no field name", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.comment("testcomment");

				expect(write).toHaveBeenLastCalledWith(":testcomment\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("can write a comment with no field value", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				session.comment();

				expect(write).toHaveBeenLastCalledWith(":\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("push", () => {
	const dataToWrite = "testData";
	const eventName = "testEvent";
	const eventId = "123456";

	it("calls all field writing methods", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const event = jest.spyOn(session, "event");
			const id = jest.spyOn(session, "id");
			const data = jest.spyOn(session, "data");
			const dispatch = jest.spyOn(session, "dispatch");

			session.on("connected", () => {
				session.push(dataToWrite);

				expect(event).toHaveBeenCalled();
				expect(id).toHaveBeenCalled();
				expect(data).toHaveBeenCalled();
				expect(dispatch).toHaveBeenCalled();

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("sets the event type to a default with no given event type", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const event = jest.spyOn(session, "event");

			session.on("connected", () => {
				session.push(dataToWrite);

				expect(event).toHaveBeenCalledWith("message");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("sets the event type to the given event type", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const event = jest.spyOn(session, "event");

			session.on("connected", () => {
				session.push(dataToWrite, eventName);

				expect(event).toHaveBeenCalledWith(eventName);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("calls data write with the same given data value", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const data = jest.spyOn(session, "data");

			session.on("connected", () => {
				session.push(dataToWrite);

				expect(data).toHaveBeenCalledWith(dataToWrite);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("calls event ID with the given event ID", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const id = jest.spyOn(session, "id");

			session.on("connected", () => {
				session.push(dataToWrite, eventName, eventId);

				expect(id).toHaveBeenCalledWith(eventId);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("generates and sets a new event ID if no custom event ID is given", (done) => {
		const oldId = "1234567890";

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const id = jest.spyOn(session, "id");

			session.on("connected", () => {
				session.id(oldId);

				session.push(dataToWrite, eventName);

				const newId = session.lastId;

				expect(id).toHaveBeenCalledWith(newId);

				expect(newId).not.toBe(oldId);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("emits a push event with the same arguments", (done) => {
		const args = ["data", "eventName", "eventId"] as const;

		const callback = jest.fn();

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await waitForConnect(session);

			session.on("push", callback);

			session.push(...args);

			expect(callback).toHaveBeenCalledWith(...args);

			done();
		});

		eventsource = new EventSource(url);
	});
});

describe("streaming", () => {
	const dataToWrite = [1, 2, 3];

	it("pipes each and every stream data emission as an event", (done) => {
		const stream = Readable.from(dataToWrite);

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			session.on("connected", async () => {
				await session.stream(stream);

				expect(push).toHaveBeenCalledTimes(3);
				expect(push).toHaveBeenNthCalledWith(1, 1, "stream");
				expect(push).toHaveBeenNthCalledWith(2, 2, "stream");
				expect(push).toHaveBeenNthCalledWith(3, 3, "stream");
			});
		});

		eventsource = new EventSource(url);

		let eventCount = 0;

		eventsource.addEventListener("stream", (event) => {
			expect(event.data).toBe(dataToWrite[eventCount].toString());

			eventCount++;

			if (eventCount === dataToWrite.length) {
				done();
			}
		});
	});

	it("can override the event type in options", (done) => {
		const eventName = "newEventName";
		const stream = Readable.from([1]);

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			session.on("connected", async () => {
				await session.stream(stream, {eventName});

				expect(push).toHaveBeenCalledWith(1, eventName);
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener(eventName, () => {
			done();
		});
	});

	it("serializes buffers as strings", (done) => {
		const buffersToWrite = [
			Buffer.from([1, 2, 3]),
			Buffer.from([4, 5, 6]),
			Buffer.from([7, 8, 9]),
		];

		const stream = Readable.from(buffersToWrite);

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			session.on("connected", async () => {
				await session.stream(stream);

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

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("resolves with 'true' when stream finishes and is successful", (done) => {
		const stream = Readable.from(dataToWrite);

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", async () => {
				const response = await session.stream(stream);

				expect(response).toBeTruthy();

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("throws with the same error that the stream errors with", (done) => {
		const error = new Error("Stream failed.");

		const stream = new Readable({
			read() {
				this.destroy(error);
			},
		});

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", async () => {
				await expect(session.stream(stream)).rejects.toThrow(error);

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("iterables", () => {
	const dataToWrite = [1, 2, 3];

	function* syncIterator() {
		for (let i = 0; i < dataToWrite.length; i++) {
			yield dataToWrite[i];
		}
	}

	async function* asyncIterator() {
		for (let i = 0; i < dataToWrite.length; i++) {
			yield dataToWrite[i];
		}
	}

	it("sends each and every yielded value as an event for synchronous generators", async () => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			await waitForConnect(session);

			await session.iterate<number>(syncIterator());

			expect(push).toHaveBeenCalledTimes(3);
			expect(push).toHaveBeenNthCalledWith(0, dataToWrite[0]);
			expect(push).toHaveBeenNthCalledWith(1, dataToWrite[1]);
			expect(push).toHaveBeenNthCalledWith(2, dataToWrite[2]);
		});

		eventsource = new EventSource(url);
	});

	it("sends each and every yielded value as an event for async generators", async () => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			await waitForConnect(session);

			await session.iterate<number>(asyncIterator());

			expect(push).toHaveBeenCalledTimes(3);
			expect(push).toHaveBeenNthCalledWith(0, dataToWrite[0]);
			expect(push).toHaveBeenNthCalledWith(1, dataToWrite[1]);
			expect(push).toHaveBeenNthCalledWith(2, dataToWrite[2]);
		});

		eventsource = new EventSource(url);
	});

	it("can override the event type in options", async () => {
		const eventName = "custom-name";

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			await waitForConnect(session);

			await session.iterate<number>(asyncIterator(), {eventName});

			expect(push).toHaveBeenCalledWith(eventName);
		});

		eventsource = new EventSource(url);
	});
});

describe("polyfill support", () => {
	const lastEventId = "123456";

	it("can retrieve the last event ID from 'event-source-polyfill' URL query", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await waitForConnect(session);

			expect(session.lastId).toBe(lastEventId);

			done();
		});

		eventsource = new EventSource(`${url}/?lastEventId=${lastEventId}`);
	});

	it("writes a preamble comment when indicated to by the 'event-source-polyfill' URL query", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const comment = jest.spyOn(session, "comment");
			const dispatch = jest.spyOn(session, "dispatch");

			await waitForConnect(session);

			expect(comment).toHaveBeenLastCalledWith(" ".repeat(2049));
			expect(dispatch).toHaveBeenCalled();

			done();
		});

		eventsource = new EventSource(`${url}/?padding=true`);
	});

	it("can retrieve the last event ID from 'eventsource-polyfill' URL query", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await waitForConnect(session);

			expect(session.lastId).toBe(lastEventId);

			done();
		});

		eventsource = new EventSource(
			`${url}/?evs_last_event_id=${lastEventId}`
		);
	});

	it("writes a preamble comment when indicated to by the 'eventsource-polyfill' URL query", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const comment = jest.spyOn(session, "comment");
			const dispatch = jest.spyOn(session, "dispatch");

			await waitForConnect(session);

			expect(comment).toHaveBeenLastCalledWith(" ".repeat(2056));
			expect(dispatch).toHaveBeenCalled();

			done();
		});

		eventsource = new EventSource(`${url}/?evs_preamble`);
	});

	it("does not write a preamble when not indicated to do so", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const comment = jest.spyOn(session, "comment");

			await waitForConnect(session);

			expect(comment).not.toHaveBeenCalled();

			done();
		});

		eventsource = new EventSource(url);
	});
});

describe("http/2", () => {
	const defaultHeaders: http2.OutgoingHttpHeaders = {
		"content-type": "text/event-stream",
		"cache-control": "no-cache, no-transform",
	};

	let http2Client: http2.ClientHttp2Session;
	let http2Req: http2.ClientHttp2Stream;
	let http2Server: http2.Http2Server;
	let http2Url: string;

	beforeEach(async () => {
		http2Server = await createHttp2Server();

		http2Url = `http://localhost:${
			(http2Server.address() as AddressInfo).port
		}`;

		http2Client = http2.connect(http2Url);

		http2Client.on("error", console.error);
	});

	afterEach(async () => {
		if (http2Client) {
			http2Client.close();
		}

		if (http2Req) {
			http2Req.close();
		}

		await closeServer(http2Server);
	});

	it("constructs and connects without errors", (done) => {
		http2Server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				res.end(done);
			});
		});

		http2Req = http2Client.request().end();
	});

	it("returns the correct response status code and headers", (done) => {
		http2Server.on("request", (req, res) => {
			const writeHead = jest.spyOn(res, "writeHead");

			const session = new Session(req, res);

			session.on("connected", () => {
				expect(writeHead).toHaveBeenCalledWith(200, defaultHeaders);

				res.end(done);
			});
		});

		http2Req = http2Client.request().end();
	});
});
