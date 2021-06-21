import http from "http";
import {url, createServer, closeServer} from "./lib/testUtils";
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
