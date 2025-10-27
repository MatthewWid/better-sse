import {createChannel, createSession} from "better-sse";
// @ts-expect-error EasySse has no type declarations
import EasySse from "easy-server-sent-events";
// @ts-expect-error SseChannel has no type declarations
import SseChannel from "sse-channel";
import {createClientPool} from "../lib/createClientPool";
import {Suite} from "./Suite";

export const suite = new Suite("Broadcast events with channels", async () => {
	const numberOfClients = 10;

	await suite.addBenchmark("better-sse", async (server, port, listen) => {
		const channel = createChannel();

		server.get("/sse", async (req, res) => {
			channel.register(await createSession(req, res));
		});

		await listen();

		let count = 0;

		return {
			run: () => {
				channel.broadcast(++count);
			},
			teardown: await createClientPool(port, numberOfClients),
		};
	});

	await suite.addBenchmark("sse-channel", async (server, port, listen) => {
		let count = 0;

		const channel = new SseChannel({jsonEncode: true});

		server.get("/sse", (req, res) => {
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
			teardown: await createClientPool(port, numberOfClients),
		};
	});

	await suite.addBenchmark(
		"easy-server-sent-events",
		async (server, port, listen) => {
			const {SSE, send} = EasySse({endpoint: "/sse"});

			server.get("/sse", (req, res, next) => {
				SSE(req, res, next);
				res.flushHeaders();
			});

			await listen();

			let count = 0;

			return {
				run: () => {
					send("all", "message", ++count);
				},
				teardown: await createClientPool(port, numberOfClients),
			};
		}
	);
});
