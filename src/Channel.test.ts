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
});
