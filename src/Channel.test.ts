import {
	vi,
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	SpyInstance,
} from "vitest";
import http from "http";
import EventSource from "eventsource";
import {
	createHttpServer,
	closeServer,
	getUrl,
	waitForConnect,
} from "./lib/testUtils";
import {Session} from "./Session";
import {Channel} from "./Channel";

declare module "./Session" {
	interface SessionState {
		isTrusted: boolean;
	}
}

let server: http.Server;
let url: string;
let eventsource: EventSource;

beforeEach(async () => {
	server = await createHttpServer();

	url = getUrl(server);
});

afterEach(async () => {
	if (eventsource && eventsource.readyState !== 2) {
		eventsource.close();
	}

	await closeServer(server);
});

describe("construction", () => {
	it("constructs without errors", () => {
		const channel = new Channel();

		expect(channel.activeSessions).toEqual([]);
		expect(channel.sessionCount).toBe(0);
	});
});

describe("registering", () => {
	it("can register and store an active session", () =>
		new Promise<void>((done) => {
			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				const channel = new Channel();

				expect(channel.sessionCount).toBe(0);
				expect(channel.activeSessions).toEqual([]);

				channel.register(session);

				expect(channel.sessionCount).toBe(1);
				expect(channel.activeSessions).toEqual([session]);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("throws when registering a disconnected session", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			server.on("request", (req, res) => {
				const session = new Session(req, res);

				expect(() => {
					channel.register(session);
				}).toThrow();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("emits a session registration event", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const callback = vi.fn();

			channel.on("session-registered", callback);

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session);

				expect(callback).toHaveBeenCalledWith(session);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("does not emit a registration event if the session is already registered", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const callback = vi.fn();

			channel.on("session-registered", callback);

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session);
				channel.register(session);

				expect(callback).toHaveBeenCalledTimes(1);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("removes a session from the active sessions after deregistering it", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session);

				expect(channel.activeSessions).toContain(session);
				expect(channel.sessionCount).toBe(1);

				channel.deregister(session);

				expect(channel.activeSessions).not.toContain(session);
				expect(channel.sessionCount).toBe(0);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("emits a session deregistration event and not a session disconnection event when deregistering", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const deregisterCallback = vi.fn();
			const disconnectedCallback = vi.fn();

			channel.on("session-deregistered", deregisterCallback);
			channel.on("session-disconnected", disconnectedCallback);

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session).deregister(session);

				expect(deregisterCallback).toHaveBeenCalledWith(session);
				expect(disconnectedCallback).not.toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("does not emit a deregistration event if the session was not registered to begin with", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const callback = vi.fn();

			channel.on("session-deregistered", callback);

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.deregister(session);

				expect(callback).not.toHaveBeenCalled();

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("automatically deregisters a session once it disconnects", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session);

				const deregister = vi.spyOn(channel, "deregister");

				await new Promise<void>((resolve) =>
					session.on("disconnected", resolve)
				);

				expect(deregister).toHaveBeenCalledWith(session);
				expect(channel.activeSessions).not.toContain(session);
				expect(channel.sessionCount).toBe(0);

				done();
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener("open", () => {
				eventsource.close();
			});
		}));

	it("emits a session disconnected event", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const callback = vi.fn();

			channel.on("session-disconnected", callback);

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session);

				await new Promise<void>((resolve) =>
					session.on("disconnected", resolve)
				);

				expect(callback).toHaveBeenCalledWith(session);

				done();
			});

			eventsource = new EventSource(url);

			eventsource.addEventListener("open", () => {
				eventsource.close();
			});
		}));
});

describe("broadcasting", () => {
	const args = ["data", "eventName"] as const;

	it("calls push on all sessions with the same arguments", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const push = vi.spyOn(session, "push");

				await waitForConnect(session);

				channel.register(session);

				channel.broadcast(...args);

				expect(push).toHaveBeenCalledWith(...args, expect.any(String));

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("calls push with a default event name if none is given", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				const push = vi.spyOn(session, "push");

				await waitForConnect(session);

				channel.register(session);

				channel.broadcast("data");

				expect(push).toHaveBeenCalledWith(
					"data",
					"message",
					expect.any(String)
				);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("emits a broadcast event with the same arguments", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const callback = vi.fn();

			channel.on("broadcast", callback);

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				channel.register(session);

				channel.broadcast(...args);

				expect(callback).toHaveBeenCalledWith(
					...args,
					expect.any(String)
				);

				done();
			});

			eventsource = new EventSource(url);
		}));

	it("can filter sessions when broadcasting", () =>
		new Promise<void>((done) => {
			const channel = new Channel();

			const sessionPushMocks: SpyInstance[] = [];

			server.on("request", async (req, res) => {
				const session = new Session(req, res);

				await waitForConnect(session);

				sessionPushMocks.push(vi.spyOn(session, "push"));

				channel.register(session);
			});

			channel.on("session-registered", (session) => {
				if (channel.sessionCount !== 3) {
					return;
				}

				session.state.isTrusted = true;

				channel.broadcast(...args, {
					filter: (session) => session.state.isTrusted,
				});

				expect(sessionPushMocks[0]).not.toHaveBeenCalled();
				expect(sessionPushMocks[1]).not.toHaveBeenCalled();
				expect(sessionPushMocks[2]).toHaveBeenCalled();

				eventSource1.close();
				eventSource2.close();
				eventSource3.close();

				done();
			});

			const eventSource1 = new EventSource(url);
			const eventSource2 = new EventSource(url);
			const eventSource3 = new EventSource(url);
		}));
});
