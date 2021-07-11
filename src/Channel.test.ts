import http from "http";
import EventSource from "eventsource";
import {createServer, closeServer, getUrl} from "./lib/testUtils";
import Session from "./Session";
import Channel from "./Channel";

let server: http.Server;
let url: string;
let eventsource: EventSource;

beforeEach(async () => {
	server = await createServer();

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
	it("can register and store an active session", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				const channel = new Channel();

				expect(channel.sessionCount).toBe(0);
				expect(channel.activeSessions).toEqual([]);

				channel.register(session);

				expect(channel.sessionCount).toBe(1);
				expect(channel.activeSessions).toEqual([session]);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("throws when registering a disconnected session", (done) => {
		const channel = new Channel();

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			expect(() => {
				channel.register(session);
			}).toThrow();

			done();
		});

		eventsource = new EventSource(url);
	});

	it("emits a session registration event", (done) => {
		const channel = new Channel();

		const callback = jest.fn();

		channel.on("session-registered", callback);

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await new Promise((resolve) => session.on("connected", resolve));

			channel.register(session);

			expect(callback).toHaveBeenCalledWith(session);

			done();
		});

		eventsource = new EventSource(url);
	});

	it("removes a session from the active sessions after deregistering it", (done) => {
		const channel = new Channel();

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				channel.register(session);

				expect(channel.activeSessions).toContain(session);
				expect(channel.sessionCount).toBe(1);

				channel.deregister(session);

				expect(channel.activeSessions).not.toContain(session);
				expect(channel.sessionCount).toBe(0);

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("emits a session deregistration event and not a session disconnection event when deregistering", (done) => {
		const channel = new Channel();

		const deregisterCallback = jest.fn();
		const disconnectedCallback = jest.fn();

		channel.on("session-deregistered", deregisterCallback);
		channel.on("session-disconnectedCallback", disconnectedCallback);

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await new Promise((resolve) => session.on("connected", resolve));

			channel.register(session).deregister(session);

			expect(deregisterCallback).toHaveBeenCalledWith(session);
			expect(disconnectedCallback).not.toHaveBeenCalled();

			done();
		});

		eventsource = new EventSource(url);
	});

	it("automatically deregisters a session once it disconnects", (done) => {
		const channel = new Channel();

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await new Promise((resolve) => session.on("connected", resolve));

			channel.register(session);

			const deregister = jest.spyOn(channel, "deregister");

			await new Promise((resolve) => session.on("disconnected", resolve));

			expect(deregister).toHaveBeenCalledWith(session);
			expect(channel.activeSessions).not.toContain(session);
			expect(channel.sessionCount).toBe(0);

			done();
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("open", () => {
			eventsource.close();
		});
	});

	it("emits a session disconnected event", (done) => {
		const channel = new Channel();

		const callback = jest.fn();

		channel.on("session-disconnected", callback);

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await new Promise((resolve) => session.on("connected", resolve));

			channel.register(session);

			await new Promise((resolve) => session.on("disconnected", resolve));

			expect(callback).toHaveBeenCalledWith(session);

			done();
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("open", () => {
			eventsource.close();
		});
	});
});

describe("write method forwarding", () => {
	it("calls push on all sessions with the same arguments", (done) => {
		const channel = new Channel();

		const args: [string, string] = ["custom", "data"];

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			const push = jest.spyOn(session, "push");

			await new Promise((resolve) => session.on("connected", resolve));

			channel.register(session);

			channel.push(...args);

			expect(push).toHaveBeenCalledWith(...args);

			done();
		});

		eventsource = new EventSource(url);
	});

	it("emits a broadcast event with the same arguments when pushing to all sessions", (done) => {
		const channel = new Channel();

		const callback = jest.fn();

		channel.on("broadcast", callback);

		const args: [string, string] = ["custom", "data"];

		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await new Promise((resolve) => session.on("connected", resolve));

			channel.register(session);

			channel.push(...args);

			expect(callback).toHaveBeenCalledWith(...args);

			done();
		});

		eventsource = new EventSource(url);
	});
});
