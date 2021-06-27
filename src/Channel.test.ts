import http from "http";
import EventSource from "eventsource";
import {url, createServer, closeServer} from "./lib/testUtils";
import Session from "./Session";
import Channel from "./Channel";

let server: http.Server;
let eventsource: EventSource;

beforeEach(async () => {
	server = await createServer();
});

afterEach(async () => {
	if (eventsource && eventsource.readyState !== 2) {
		eventsource.close();
	}

	await closeServer(server);
});

describe("construction", () => {
	it("constructs without errors", () => {
		expect(() => {
			new Channel();
		}).not.toThrow();
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
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			const channel = new Channel();

			expect(() => {
				channel.register(session);
			}).toThrow();

			done();
		});

		eventsource = new EventSource(url);
	});

	it("removes a session from the active sessions after deregistering it", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				const channel = new Channel();

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

	it("automatically deregisters a session once it disconnects", (done) => {
		server.on("request", async (req, res) => {
			const session = new Session(req, res);

			await new Promise((resolve) => session.on("connected", resolve));

			const channel = new Channel();

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
});

describe("write method forwarding", () => {
	it("calls push on all sessions with the same arguments", (done) => {
		const args: [string, string] = ["custom", "data"];
		const channel = new Channel();

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
});
