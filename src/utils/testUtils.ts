import http from "node:http";
import http2 from "node:http2";
import type net from "node:net";
import type {AddressInfo} from "node:net";
import {EventSource} from "eventsource";
import type {EventBuffer} from "../EventBuffer";
import type {Session} from "../Session";

const createHttpServer = (): Promise<http.Server> =>
	new Promise<http.Server>((resolve, reject) => {
		const server = http.createServer().listen();

		server.on("listening", () => resolve(server));
		server.on("error", reject);
	});

const createHttp2Server = (): Promise<http2.Http2Server> =>
	new Promise<http2.Http2Server>((resolve, reject) => {
		const server = http2.createServer().listen();

		server.on("listening", () => resolve(server));
		server.on("error", reject);
	});

const closeServer = (server: net.Server): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		if (server.listening) {
			server.close((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		} else {
			resolve();
		}
	});

const getUrl = (server: net.Server): string =>
	`http://localhost:${(server.address() as AddressInfo).port}`;

interface CreateEventSourceOptions {
	headers?: Record<string, string | string[]>;
}

const createEventSource = (
	url: string,
	options: CreateEventSourceOptions = {}
): EventSource =>
	new EventSource(url, {
		fetch: (fetchUrl, fetchInit) =>
			fetch(fetchUrl, {
				...fetchInit,
				headers: {
					...fetchInit.headers,
					...options.headers,
				},
			}),
	});

const waitForConnect = (session: Session): Promise<void> =>
	new Promise((resolve) => {
		if (session.isConnected) {
			resolve();
		} else {
			session.on("connected", resolve);
		}
	});

const getBuffer = (session: Session): EventBuffer =>
	Reflect.get(session, "buffer");

const createRequest = (
	options: RequestInit = {},
	urlString = "http://localhost:8080/sse"
): {request: Request; controller: AbortController} => {
	const url = new URL(urlString);

	const controller = new AbortController();

	return {
		request: new Request(urlString, {
			headers: {
				Host: url.host,
				Accept: "text/event-stream",
				"Cache-Control": "no-cache",
				// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/User-Agent#chrome_ua_string
				"User-Agent":
					"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
				...options.headers,
			},
			signal: controller.signal,
			...options,
		}),
		controller,
	};
};

const createResponse = (
	options: ResponseInit = {},
	body: ConstructorParameters<typeof Response>[0] = null
): {response: Response} => ({
	response: new Response(body, options),
});

export {
	createHttpServer,
	createHttp2Server,
	closeServer,
	getUrl,
	createEventSource,
	waitForConnect,
	getBuffer,
	createRequest,
	createResponse,
};
