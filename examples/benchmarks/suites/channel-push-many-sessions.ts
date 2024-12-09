/* eslint-disable @typescript-eslint/ban-ts-comment */

import {createChannel, createSession} from "better-sse";
// @ts-ignore
import EasySse from "easy-server-sent-events";
// @ts-ignore
import SseChannel from "sse-channel";
import {createClientPool} from "../lib/createClientPool";
import {Suite} from "./Suite";

export const suite = new Suite("Push events with channels", async () => {
	const numberOfClients = 10;

	await suite.addBenchmark("better-sse", async (server, port, listen) => {
		let count = 0;

		const channel = createChannel();

		server.get("/", async (req, res) => {
			channel.register(await createSession(req, res));
		});

		await listen();

		return {
			run: () => {
				channel.broadcast(++count);
			},
			teardown: await createClientPool({port, numberOfClients}),
		};
	});

	await suite.addBenchmark("sse-channel", async (server, port, listen) => {
		let count = 0;

		const channel = new SseChannel({jsonEncode: true});

		server.get("/", (req, res) => {
			channel.addClient(req, res);
		});

		await listen();

		return {
			run: () => {
				++count;

				channel.send({
					event: "message",
					data: count,
					id: count,
				});
			},
			teardown: await createClientPool({port, numberOfClients}),
		};
	});

	await suite.addBenchmark(
		"easy-server-sent-events",
		async (server, port, listen) => {
			let count = 0;

			const {SSE, send} = EasySse({endpoint: "/"});

			server.get("/", (req, res, next) => {
				SSE(req, res, next);
				res.flushHeaders();
			});

			await listen();

			return {
				run: () => {
					send("all", "message", ++count);
				},
				teardown: await createClientPool({port, numberOfClients}),
			};
		}
	);
});
