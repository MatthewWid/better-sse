import type http from "node:http";
import type {EventSource} from "eventsource";
import {afterEach, beforeEach, expect, it} from "vitest";
import {Session} from "./Session";
import {createSession} from "./createSession";
import {
	closeServer,
	createEventSource,
	createHttpServer,
	getUrl,
} from "./lib/testUtils";

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

it("resolves with an instance of a session", () =>
	new Promise<void>((done) => {
		server.on("request", async (req, res) => {
			const session = await createSession(req, res);

			expect(session).toBeInstanceOf(Session);

			done();
		});

		eventsource = createEventSource(url);
	}));
