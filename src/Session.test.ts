import {vi, describe, it, expect, beforeEach, afterEach} from "vitest";
import http from "http";
import http2 from "http2";
import {AddressInfo} from "net";
import EventSource from "eventsource";
import {Readable} from "stream";
import {
	createHttpServer,
	createHttp2Server,
	closeServer,
	getUrl,
	waitForConnect,
	getBuffer,
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
	vi.useRealTimers();

	if (eventsource) {
		eventsource.close();
	}

	await closeServer(server);
});

describe("connection", () => {
	const defaultHeaders: http.OutgoingHttpHeaders = {
		"Content-Type": "text/event-stream",
		"Cache-Control":
			"private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
		Connection: "keep-alive",
		Pragma: "no-cache",
		"X-Accel-Buffering": "no",
	};

	it("constructs without errors when giving no options", () =>
		new Promise<void>((done) => {
			server.on("request", (req, res) => {
				expect(() => {
					new Session(req, res);
				}).not.toThrow();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("fires the connection event non-synchronously after response headers are sent", () =>
		new Promise<void>((done) => {
			server.on("request", (req, res) => {
				const session = new Session(req, res);

				session.on("connected", () => {
					done();
				});
			});

			eventsource = new EventSource(url);
		}));

	it("fires the disconnection event when the client kills the connection", () =>
		new Promise<void>((done) => {
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
		}));

	it("fires the disconnection event when the server closes the response stream", () =>
		new Promise<void>((done) => {
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
		}));

	it("sets the isConnected boolean based on whether the session is open or not", () =>
		new Promise<void>((done) => {
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
		}));

	it("returns the correct response status code and headers", () =>
		new Promise<void>((done) => {
			server.on("request", (req, res) => {
				const writeHead = vi.spyOn(res, "writeHead");

				const session = new Session(req, res);

				session.on("connected", () => {
					expect(writeHead).toHaveBeenCalledWith(200, defaultHeaders);

					done();
				});
			});

			eventsource = new EventSource(url);
		}));

	it("can set the status code in options", () =>
		new Promise<void>((done) => {
			server.on("request", (req, res) => {
				const session = new Session(req, res, {statusCode: 201});

				session.on("connected", () => {
					expect(res.statusCode).toBe(201);

					done();
				});
			});

			eventsource = new EventSource(url);
		}));

	it("adds custom headers to the response headers", () =>
		new Promise<void>((done) => {
			const additionalHeaders = {
				"x-test-header-1": "123",
				"x-test-header-2": "456",
			};

			server.on("request", (req, res) => {
				const writeHead = vi.spyOn(res, "writeHead");

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
		}));

	it("sets custom headers without values to an empty string", () =>
		new Promise<void>((done) => {
			const additionalHeaders = {
				"x-test-header-1": undefined,
			};

			server.on("request", (req, res) => {
				const writeHead = vi.spyOn(res, "writeHead");

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
		}));

	it("can overwrite the default headers", () =>
		new Promise<void>((done) => {
			const additionalHeaders = {
				"X-Accel-Buffering": "yes",
			};

			server.on("request", (req, res) => {
				const writeHead = vi.spyOn(res, "writeHead");

				const session = new Session(req, res, {
					headers: additionalHeaders,
				});

				session.on("connected", () => {
					const sentHeaders = writeHead.mock.calls[0][1];

					expect(sentHeaders).toMatchObject({
						"X-Accel-Buffering": "yes",
					});

					done();
				});
			});

			eventsource = new EventSource(url);
		}));
});

describe("retry", () => {
	it("writes an initial retry field by default", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const buffer = getBuffer(session);

				const retry = vi.spyOn(buffer, "retry");

				await waitForConnect(session);

				expect(retry).toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can modify the initial retry field value", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					retry: 4000,
				});

				const buffer = getBuffer(session);

				const retry = vi.spyOn(buffer, "retry");

				await waitForConnect(session);

				expect(retry).toHaveBeenCalledWith(4000);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can prevent the initial retry field from being sent", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					retry: null,
				});

				const buffer = getBuffer(session);

				const retry = vi.spyOn(buffer, "retry");

				await waitForConnect(session);

				expect(retry).not.toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));
});

describe("keep-alive", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("sends a comment in intervals to keep the connection alive", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				// @ts-expect-error spying on private method
				const keepAlive = vi.spyOn(session, "keepAlive");

				vi.advanceTimersToNextTimer().advanceTimersToNextTimer();

				await waitForConnect(session);

				expect(keepAlive).toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can set the keep-alive interval in options", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {keepAlive: 30000});

				// @ts-expect-error spying on private method
				const keepAlive = vi.spyOn(session, "keepAlive");

				vi.advanceTimersToNextTimer().advanceTimersToNextTimer();

				await waitForConnect(session);

				expect(keepAlive).toHaveBeenCalledTimes(1);

				vi.advanceTimersByTime(15000);

				expect(keepAlive).toHaveBeenCalledTimes(1);

				vi.advanceTimersByTime(15000);

				expect(keepAlive).toHaveBeenCalledTimes(2);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can disable the keep-alive mechanism in options", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {keepAlive: null});

				// @ts-expect-error spying on private method
				const keepAlive = vi.spyOn(session, "keepAlive");

				vi.advanceTimersToNextTimer().advanceTimersToNextTimer();

				await waitForConnect(session);

				expect(keepAlive).not.toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));
});

describe("event ID management", () => {
	const givenLastId = "12345678";

	it("starts with an empty last event ID", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				expect(session.lastId).toBe("");

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("trusts and stores the given last event ID by default", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				expect(session.lastId).toBe(givenLastId);

				done();
			});

			eventsource = new EventSource(url, {
				headers: {"Last-Event-ID": givenLastId},
			});
		}));

	it("ignores the given last event ID if set in options", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					trustClientEventId: false,
				});

				await waitForConnect(session);

				expect(session.lastId).toBe("");

				done();
			});

			eventsource = new EventSource(url, {
				headers: {"Last-Event-ID": givenLastId},
			});
		}));
});

describe("push", () => {
	const args = ["test-data", "test-name", "test-id"] as const;

	it("passes push arguments to internal buffer push method", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const buffer = getBuffer(session);

				const push = vi.spyOn(buffer, "push");

				await waitForConnect(session);

				session.push(...args);

				expect(push).toHaveBeenCalledWith(...args);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("emits a push event with the same arguments", () =>
		new Promise<void>((done) => {
			const callback = vi.fn();

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				session.on("push", callback);

				session.push(...args);

				expect(callback).toHaveBeenCalledWith(...args);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("sets the last id to the event id", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				session.push(...args);

				const [, , givenId] = args;

				expect(session.lastId).toBe(givenId);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("flushes buffer data to the client", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const flush = vi.spyOn(session, "flush");

				session.push(...args);

				expect(flush).toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));
});

describe("streaming", () => {
	const dataToWrite = [1, 2, 3];

	it("pipes each and every stream data emission as an event", () =>
		new Promise<void>((done) => {
			const stream = Readable.from(dataToWrite);

			server.on("request", (req, res) => {
				const session = new Session(req, res);

				const push = vi.spyOn(session, "push");

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
		}));

	it("can override the event type in options", () =>
		new Promise<void>((done) => {
			const eventName = "newEventName";
			const stream = Readable.from([1]);

			server.on("request", (req, res) => {
				const session = new Session(req, res);

				const push = vi.spyOn(session, "push");

				session.on("connected", async () => {
					await session.stream(stream, {eventName});

					expect(push).toHaveBeenCalledWith(1, eventName);
				});
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener(eventName, () => {
				done();
			});
		}));

	it("serializes buffers as strings", () =>
		new Promise<void>((done) => {
			const buffersToWrite = [
				Buffer.from([1, 2, 3]),
				Buffer.from([4, 5, 6]),
				Buffer.from([7, 8, 9]),
			];

			const stream = Readable.from(buffersToWrite);

			server.on("request", (req, res) => {
				const session = new Session(req, res);

				const push = vi.spyOn(session, "push");

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
		}));

	it("resolves with 'true' when stream finishes and is successful", () =>
		new Promise<void>((done) => {
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
		}));

	it("throws with the same error that the stream errors with", () =>
		new Promise<void>((done) => {
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
		}));
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

			const push = vi.spyOn(session, "push");

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

			const push = vi.spyOn(session, "push");

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

			const push = vi.spyOn(session, "push");

			await waitForConnect(session);

			await session.iterate<number>(asyncIterator(), {eventName});

			expect(push).toHaveBeenCalledWith(eventName);
		});

		eventsource = new EventSource(url);
	});
});

describe("polyfill support", () => {
	const lastEventId = "123456";

	it("can retrieve the last event ID from 'event-source-polyfill' URL query", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				expect(session.lastId).toBe(lastEventId);

				done();
			});

			eventsource = new EventSource(`${url}/?lastEventId=${lastEventId}`);
		}));

	it("writes a preamble comment when indicated to by the 'event-source-polyfill' URL query", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const buffer = getBuffer(session);

				const comment = vi.spyOn(buffer, "comment");
				const dispatch = vi.spyOn(buffer, "dispatch");

				await waitForConnect(session);

				expect(comment).toHaveBeenLastCalledWith(" ".repeat(2049));
				expect(dispatch).toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(`${url}/?padding=true`);
		}));

	it("can retrieve the last event ID from 'eventsource-polyfill' URL query", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				expect(session.lastId).toBe(lastEventId);

				done();
			});

			eventsource = new EventSource(
				`${url}/?evs_last_event_id=${lastEventId}`
			);
		}));

	it("writes a preamble comment when indicated to by the 'eventsource-polyfill' URL query", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const buffer = getBuffer(session);

				const comment = vi.spyOn(buffer, "comment");
				const dispatch = vi.spyOn(buffer, "dispatch");

				await waitForConnect(session);

				expect(comment).toHaveBeenLastCalledWith(" ".repeat(2056));
				expect(dispatch).toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(`${url}/?evs_preamble`);
		}));

	it("does not write a preamble when not indicated to do so", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const buffer = getBuffer(session);

				const comment = vi.spyOn(buffer, "comment");

				await waitForConnect(session);

				expect(comment).not.toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));
});

describe("http/2", () => {
	const defaultHeaders: http2.OutgoingHttpHeaders = {
		"content-type": "text/event-stream",
		"cache-control":
			"private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
		pragma: "no-cache",
		"x-accel-buffering": "no",
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

	it("constructs and connects without errors", () =>
		new Promise<void>((done) => {
			http2Server.on("request", (req, res) => {
				const session = new Session(req, res);

				session.on("connected", () => {
					res.end(done);
				});
			});

			http2Req = http2Client.request().end();
		}));

	it("returns the correct response status code and headers", () =>
		new Promise<void>((done) => {
			http2Server.on("request", (req, res) => {
				const writeHead = vi.spyOn(res, "writeHead");

				const session = new Session(req, res);

				session.on("connected", () => {
					expect(writeHead).toHaveBeenCalledWith(200, defaultHeaders);

					res.end(done);
				});
			});

			http2Req = http2Client.request().end();
		}));
});
