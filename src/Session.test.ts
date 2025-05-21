import type http from "node:http";
import http2 from "node:http2";
import type {AddressInfo} from "node:net";
import EventSource from "eventsource";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EventBuffer} from "./EventBuffer";
import {Session} from "./Session";
import {DEFAULT_RESPONSE_CODE, DEFAULT_RESPONSE_HEADERS} from "./lib/constants";
import {
	closeServer,
	createHttp2Server,
	createHttpServer,
	createRequest,
	createResponse,
	getBuffer,
	getUrl,
	waitForConnect,
} from "./lib/testUtils";

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
	it("constructs without errors when given no options", () =>
		new Promise<void>((done) => {
			server.on("request", (req, res) => {
				expect(() => {
					new Session(req, res);
				}).not.toThrow();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("throws when given an IncomingMessage object but no ServerResponse", () =>
		new Promise<void>((done) => {
			server.on("request", (req) => {
				// @ts-expect-error testing no ServerResponse
				expect(() => new Session(req)).toThrowError("ServerResponse");

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("throws when given no arguments", () =>
		new Promise<void>((done) => {
			// @ts-expect-error testing no arguments
			expect(() => new Session()).toThrowError("Malformed");

			done();
		}));

	it("fires the connection event non-synchronously after response headers are sent", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				expect(session.isConnected).toBeFalsy();

				await waitForConnect(session);

				expect(session.isConnected).toBeTruthy();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("fires the disconnection event when the client kills the connection", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				session.on("disconnected", done);
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener("open", () => {
				eventsource.close();
			});
		}));

	it("fires the disconnection event when the server ends the response stream", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				session.on("disconnected", () => {
					done();
				});

				await waitForConnect(session);

				res.end();
			});

			eventsource = new EventSource(url);
		}));

	it("fires the disconnection event when the response is closed", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				expect(session.isConnected).toBeFalsy();

				session.on("disconnected", () => {
					expect(session.isConnected).toBeFalsy();

					done();
				});

				await waitForConnect(session);

				expect(session.isConnected).toBeTruthy();

				res.emit("close");
			});

			eventsource = new EventSource(url);
		}));

	it("sets the isConnected boolean based on whether the session is open or not", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				expect(session.isConnected).toBeFalsy();

				session.on("disconnected", () => {
					expect(session.isConnected).toBeFalsy();

					done();
				});

				await waitForConnect(session);

				expect(session.isConnected).toBeTruthy();

				res.end();
			});

			eventsource = new EventSource(url);
		}));

	it("returns the correct response status code and headers by default", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const writeHead = vi.spyOn(res, "writeHead");

				await waitForConnect(session);

				const lowercasedHeaders: Record<string, string | string[]> = {};

				for (const [key, value] of Object.entries(DEFAULT_RESPONSE_HEADERS)) {
					lowercasedHeaders[key.toLowerCase()] = value;
				}

				expect(writeHead).toHaveBeenCalledWith(
					DEFAULT_RESPONSE_CODE,
					lowercasedHeaders
				);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can set the status code in options", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {statusCode: 201});

				await waitForConnect(session);

				expect(res.statusCode).toBe(201);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("adds custom headers to the response headers", () =>
		new Promise<void>((done) => {
			const additionalHeaders = {
				"x-test-header-1": "123",
				"x-test-header-2": "456",
			};

			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					headers: additionalHeaders,
				});

				const writeHead = vi.spyOn(res, "writeHead");

				await waitForConnect(session);

				const sentHeaders = writeHead.mock.calls[0][1];

				expect(sentHeaders).toMatchObject(additionalHeaders);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can omit headers by setting its value to undefined", () =>
		new Promise<void>((done) => {
			const customHeaders = {
				Connection: undefined,
				"X-Test-Header": undefined,
			};

			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					headers: customHeaders,
				});

				const writeHead = vi.spyOn(res, "writeHead");

				await waitForConnect(session);

				const sentHeaders = writeHead.mock.calls[0][1];

				expect(sentHeaders).not.toHaveProperty("connection");
				expect(sentHeaders).not.toHaveProperty("x-test-header");

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can overwrite the default headers with a single value", () =>
		new Promise<void>((done) => {
			const additionalHeaders = {
				"X-Accel-Buffering": "yes",
			};

			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					headers: additionalHeaders,
				});

				const writeHead = vi.spyOn(res, "writeHead");

				await waitForConnect(session);

				const sentHeaders = writeHead.mock.calls[0][1];

				expect(sentHeaders).toMatchObject({
					"x-accel-buffering": "yes",
				});

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can set and overwrite headers with an array of values", () =>
		new Promise<void>((done) => {
			const additionalHeaders = {
				"Cache-Control": ["private", "must-understand"],
				"X-Extra": ["123", "456"],
			};

			server.on("request", async (req, res) => {
				const session = new Session(req, res, {
					headers: additionalHeaders,
				});

				const writeHead = vi.spyOn(res, "writeHead");

				await waitForConnect(session);

				const sentHeaders = writeHead.mock.calls[0][1];

				expect(sentHeaders).toMatchObject({
					"cache-control": "private, must-understand",
					"x-extra": "123, 456",
				});

				done();
			});

			eventsource = new EventSource(url);
		}));
});

describe("state", () => {
	const givenState = {id: "123"};

	it("can set the initial state in options", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res, {state: givenState});

				await waitForConnect(session);

				expect(session.state.id).toBe(givenState.id);

				done();
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

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sends a comment in intervals to keep the connection alive", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				// @ts-expect-error spying on private method
				const keepAlive = vi.spyOn(session, "keepAlive");

				vi.advanceTimersToNextTimer();

				await waitForConnect(session);

				vi.advanceTimersToNextTimer();

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

				vi.advanceTimersToNextTimer();

				await waitForConnect(session);

				vi.advanceTimersToNextTimer();

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

				vi.advanceTimersToNextTimer();

				await waitForConnect(session);

				vi.advanceTimersToNextTimer();

				expect(keepAlive).not.toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));
});

describe("event id management", () => {
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

	it("sets the last id to the given event id", () =>
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

	it("throws when pushing after the session has disconnected", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				session.on("disconnected", () => {
					expect(() => session.push(null)).toThrowError();

					done();
				});

				await waitForConnect(session);

				expect(() => session.push(null)).not.toThrowError();

				res.end();
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

				await session.batch((buffer) => {
					buffer.push(data);
				});
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener("message", (event) => {
				const contents = JSON.parse(event.data);

				expect(contents).toBe(data);

				done();
			});
		}));

	it("given an asynchronous callback, creates a new event buffer and writes its contents to the response after the returned promise has resolved", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				await session.batch(async (buffer) => {
					buffer.push(data);
				});
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener("message", (event) => {
				const contents = JSON.parse(event.data);

				expect(contents).toBe(data);

				done();
			});
		}));

	it("given an event buffer, writes its contents to the response", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const buffer = new EventBuffer();

				buffer.push(data);

				await session.batch(buffer);
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener("message", (event) => {
				const contents = JSON.parse(event.data);

				expect(contents).toBe(data);

				done();
			});
		}));

	it("given an event buffer, does NOT clear its contents after writing", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const buffer = new EventBuffer();

				buffer.push(data);

				const before = buffer.read();

				await session.batch(buffer);

				const after = buffer.read();

				expect(before).toBe(after);

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

			eventsource = new EventSource(`${url}/?evs_last_event_id=${lastEventId}`);
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

describe("fetch api", () => {
	describe("from node incomingmessage/serverresponse", () => {
		it("copies the method, status code and headers from the req and res", () =>
			new Promise<void>((done) => {
				server.on("request", async (req, res) => {
					res.statusCode = 201;
					res.setHeader("X-Test-Res", "123");

					const session = new Session(req, res);

					await waitForConnect(session);

					const request = session.getRequest();

					expect(request.url).toContain(req.headers.host);
					expect(request.url).toContain(req.url);
					expect(request.method).toBe(req.method);
					expect(request.headers.get("X-Test-Single")).toBe("456");
					expect(request.headers.get("X-Test-Array")).toBe("123, 456");

					for (const [key, value] of Object.entries(req.headers)) {
						expect(request.headers.has(key)).toBeTruthy();
						expect(request.headers.get(key)).toBe(value);
					}

					const response = session.getResponse();

					expect(response.status).toBe(res.statusCode);
					expect(response.headers.get("X-Test-Res")).toBe("123");

					done();
				});

				eventsource = new EventSource(url, {
					headers: {
						"X-Test-Single": "456",
						"X-Test-Array": ["123", "456"],
					},
				});
			}));

		it("triggers abort signal on req close", () =>
			new Promise<void>((done) => {
				server.on("request", async (req, res) => {
					const session = new Session(req, res);

					await waitForConnect(session);

					const request = session.getRequest();

					const callback = vi.fn();

					request.signal.addEventListener("abort", callback);

					req.once("close", () => {
						expect(callback).toHaveBeenCalled();
						done();
					});

					req.destroy();
				});

				eventsource = new EventSource(url);
			}));

		it("triggers abort signal on res close", () =>
			new Promise<void>((done) => {
				server.on("request", async (req, res) => {
					const session = new Session(req, res);

					await waitForConnect(session);

					const request = session.getRequest();

					const callback = vi.fn();

					request.signal.addEventListener("abort", callback);

					res.once("close", () => {
						expect(callback).toHaveBeenCalled();
						done();
					});

					res.end();
				});

				eventsource = new EventSource(url);
			}));
	});

	describe("from fetch request/response", () => {
		it("can pass options as the second argument in place of a response object", async () => {
			const {request} = createRequest();

			const session = new Session(request, {
				headers: {
					"X-Test": "123",
				},
			});

			await waitForConnect(session);

			const {headers} = session.getResponse();

			expect(headers.get("X-Test")).toBe("123");
		});

		it("can pass options as the third argument when giving undefined in place of a response object", async () => {
			const {request} = createRequest();

			const session = new Session(request, undefined, {
				headers: {
					"X-Test": "123",
				},
			});

			await waitForConnect(session);

			const {headers} = session.getResponse();

			expect(headers.get("X-Test")).toBe("123");
		});

		it("throws when passing options objects to both the second and third arguments at the same time", () => {
			const {request} = createRequest();

			expect(
				() =>
					// @ts-expect-error testing passing options to both second and third arguments
					new Session(
						request,
						{statusCode: 201},
						{
							headers: {
								"X-Test": "123",
							},
						}
					)
			).toThrowError("not to both");
		});

		it("stores the original request object", async () => {
			const {request} = createRequest();

			const session = new Session(request);

			await waitForConnect(session);

			expect(session.getRequest()).toBe(request);
		});

		it("copies the status code and headers from the response", async () => {
			const {request} = createRequest();
			const {response} = createResponse({
				status: 201,
				headers: {
					pragma: "yes-cache",
					"X-Test": "123",
				},
			});

			const session = new Session(request, response);

			await waitForConnect(session);

			const {status, headers} = session.getResponse();

			expect(status).toBe(201);
			expect(headers.get("Pragma")).toBe("yes-cache");
			expect(headers.get("X-Test")).toBe("123");
		});

		it("prioritizes options status and headers over response", async () => {
			const {request} = createRequest();
			const {response} = createResponse({
				status: 201,
				headers: {
					"X-Test": "123",
				},
			});

			const session = new Session(request, response, {
				statusCode: 202,
				headers: {
					"X-Test": "456",
				},
			});

			await waitForConnect(session);

			const {status, headers} = session.getResponse();

			expect(status).toBe(202);
			expect(headers.get("X-Test")).toBe("456");
		});

		it("triggers disconnect on request controller abort", async () => {
			const {request, controller} = createRequest();

			const session = new Session(request);

			await waitForConnect(session);

			const callback = vi.fn();

			session.on("disconnected", callback);

			controller.abort();

			expect(callback).toHaveBeenCalled();
		});

		it("writes data as UTF-8-encoded bytes to the response stream", async () => {
			const {request, controller} = createRequest();

			const session = new Session(request);

			await waitForConnect(session);

			const response = session.getResponse();

			if (!response.body) {
				throw new Error("Response body does not exist.");
			}

			session.push("ABC");

			setImmediate(() => {
				controller.abort();
			});

			const data: Uint8Array[] = [];

			for await (const chunk of response.body) {
				data.push(chunk);
			}

			for (const chunk of data) {
				expect(chunk).toBeInstanceOf(Uint8Array);
			}

			const last = data.at(-1);

			if (!last) {
				throw new Error("No chunks written to response stream.");
			}

			const decoder = new TextDecoder("utf-8");

			const decoded = decoder.decode(last);

			expect(decoded).toContain("ABC");
		});
	});
});

describe("http/2 compatibility api", () => {
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
			http2Server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				await new Promise<void>((resolve) => res.end(resolve));

				done();
			});

			http2Req = http2Client.request().end();
		}));

	it("throws when given a Http2ServerRequest object but no Http2ServerResponse", () =>
		new Promise<void>((done) => {
			http2Server.on("request", async (req) => {
				// @ts-expect-error testing no Http2ServerResponse
				expect(() => new Session(req)).toThrowError("HTTP2ServerResponse");

				done();
			});

			http2Req = http2Client.request().end();
		}));

	it("returns the correct status code", () =>
		new Promise<void>((done) => {
			http2Server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const writeHead = vi.spyOn(res, "writeHead");

				await waitForConnect(session);

				const [givenCode] = writeHead.mock.calls[0];

				expect(givenCode).toBe(DEFAULT_RESPONSE_CODE);

				await new Promise<void>((resolve) => res.end(resolve));

				done();
			});

			http2Req = http2Client.request().end();
		}));

	it("omits http/2 pseudo-headers from the request headers", () =>
		new Promise<void>((done) => {
			http2Server.on("request", async (req, res) => {
				expect(req.headers).toHaveProperty(":method");

				const session = new Session(req, res);

				await waitForConnect(session);

				const {headers} = session.getRequest();

				for (const [key] of headers) {
					expect(key.startsWith(":")).toBeFalsy();
				}

				await new Promise<void>((resolve) => res.end(resolve));

				done();
			});

			http2Req = http2Client.request().end();
		}));
});
