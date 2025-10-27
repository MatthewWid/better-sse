import {createServer as createRawHttpServer} from "node:http";
import {createSession, type Session} from "better-sse";
import type {Response as ExpressResponse} from "express";
import SSE, {type Client} from "sse";
// @ts-expect-error SseChannel has no type declarations
import SseChannel from "sse-channel";
import {createEventSource} from "../lib/createEventSource";
import {Suite} from "./Suite";

export const suite = new Suite("Push events with sessions", async () => {
	await suite.addBenchmark("better-sse", async (server, port, listen) => {
		let session: Session;

		server.get("/sse", async (req, res) => {
			session = await createSession(req, res);
		});

		await listen();

		const eventSource = await createEventSource(port);

		let count = 0;

		return {
			run: () => {
				session.push(++count);
			},
			teardown: () => eventSource.close(),
		};
	});

	await suite.addBenchmark("sse-channel", async (server, port, listen) => {
		const channel = new SseChannel({jsonEncode: true});

		let res: ExpressResponse;

		server.get("/sse", (req, _res) => {
			res = _res;
			channel.addClient(req, res);
		});

		await listen();

		const eventSource = await createEventSource(port);

		let count = 0;

		return {
			run: () => {
				++count;

				channel.send(
					{
						event: "message",
						data: count,
						id: count,
					},
					[res]
				);
			},
			teardown: () => eventSource.close(),
		};
	});

	await suite.addBenchmark("sse", async (server) => {
		const port = ++Suite.port;

		// `sse` package cannot attach to an Express instance directly, so wrap with a raw Node HTTP server
		const wrapper = createRawHttpServer(server);

		const sse = new SSE(wrapper);

		let client: Client;

		sse.on("connection", (_client) => {
			client = _client;
		});

		await new Promise<void>((resolve) => wrapper.listen(port, () => resolve()));

		const eventSource = await createEventSource(port);

		let count = 0;

		return {
			run: () => {
				const stringified = (count++).toString();

				client.send({
					event: "message",
					data: stringified,
					id: stringified,
				});
			},
			teardown: () => eventSource.close(),
		};
	});
});
