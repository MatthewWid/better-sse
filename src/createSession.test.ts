import {it, expect, beforeEach, afterEach} from "vitest";
import type http from "http";
import EventSource from "eventsource";
import {createHttpServer, closeServer, getUrl} from "./lib/testUtils";
import {Session} from "./Session";
import {createSession} from "./createSession";

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

		eventsource = new EventSource(url);
	}));
