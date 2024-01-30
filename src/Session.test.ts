import {vi, describe, it, expect, beforeEach, afterEach} from "vitest";
import http from "http";
import http2 from "http2";
import {AddressInfo} from "net";
import EventSource from "eventsource";
import {
	createHttpServer,
	createHttp2Server,
	closeServer,
	getUrl,
	waitForConnect,
	getBuffer,
} from "./lib/testUtils";
import {Session} from "./Session";
import {EventBuffer} from "./EventBuffer";

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

	it("sets the isConnected boolean based on whether the response emit close", () =>
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

					res.emit('close')
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

		it("Throw if session is not connected", () =>
			new Promise<void>((done) => {
				server.on("request", (req, res) => {
					const session = new Session(req, res);

					session.on("disconnected", () => {
						expect(() => {
							session.push('test')
						}).toThrow()

						done();
					});

					session.on("connected", () => {
						expect(() => {
							session.push('test')
						}).not.toThrow()
						res.emit('close')
					});
				});

				eventsource = new EventSource(url);
			}));
});

describe("batching", () => {
	const data = "test-data";

	it("given a synchronous callback, creates a new event buffer and writes its contents to the response after execution has finished", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const write = vi.spyOn(res, "write");

				await session.batch((buffer) => {
					buffer.push(data);
				});

				expect(write.mock.calls[0][0]).toContain(data);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("given an asynchronous callback, creates a new event buffer and writes its contents to the response after the returned promise has resolved", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const write = vi.spyOn(res, "write");

				await session.batch(async (buffer) => {
					buffer.push(data);
				});

				expect(write.mock.calls[0][0]).toContain(data);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("given an event buffer, writes its contents to the response", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const write = vi.spyOn(res, "write");

				const buffer = new EventBuffer();

				buffer.push(data);

				await session.batch(buffer);

				expect(write.mock.calls[0][0]).toContain(data);

				done();
			});

			eventsource = new EventSource(url);
		}));
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
