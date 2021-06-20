import http from "http";
import EventSource from "eventsource";
import {url, createServer, closeServer} from "./lib/testUtils";
import Session from "./Session";
import createSession from "./createSession";

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

it("resolves with an instance of a session", async (done) => {
	server.on("request", async (req, res) => {
		const session = await createSession(req, res);

		expect(session).toBeInstanceOf(Session);

		done();
	});

	eventsource = new EventSource(url);
});
