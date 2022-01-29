/* eslint-disable @typescript-eslint/ban-ts-comment */

import express from "express";
import EventSource from "eventsource";
import {Suite, Options} from "benchmark";
import {createSession, createChannel} from "better-sse";
// @ts-ignore
import SseChannel from "sse-channel";
// @ts-ignore
import EasySse from "easy-server-sent-events";

const createClientPool = async (port: number): Promise<() => void> => {
	const sources = new Set<EventSource>();
	const listeners = new Set<Promise<unknown>>();

	for (let index = 0; index < 10; ++index) {
		const eventsource = new EventSource(`http://localhost:${port}`);
		const listener = new Promise((resolve) =>
			eventsource.addEventListener("open", resolve)
		);

		sources.add(eventsource);
		listeners.add(listener);
	}

	await Promise.all(listeners);

	return () => {
		sources.forEach((eventsource) => eventsource.close());
	};
};

const options: Options = {};

(async () => {
	const name = "Push events with channels.";

	const suite = new Suite(name, {
		async: true,
	});

	suite.on("start", () => {
		console.log(`Benchmarking "${name}".`);
	});

	suite.on("cycle", (event: Event) => {
		console.log(String(event.target));
	});

	suite.on("complete", () => {
		process.exit(0);
	});

	await Promise.all([
		(async () => {
			let count = 0;
			const server = express();
			const port = 8000;
			const channel = createChannel();

			server.get("/", async (req, res) => {
				const session = await createSession(req, res);

				channel.register(session);
			});

			await new Promise<void>((resolve) => server.listen(port, resolve));

			const finished = await createClientPool(port);

			suite.add(
				"better-sse",
				() => {
					channel.broadcast(++count);
				},
				{
					...options,
					onComplete: finished,
				}
			);
		})(),
		(async () => {
			let count = 0;
			const server = express();
			const port = 8010;
			const channel = new SseChannel({jsonEncode: true});

			server.get("/", (req, res) => {
				channel.addClient(req, res);
			});

			await new Promise<void>((resolve) => server.listen(port, resolve));

			const finished = await createClientPool(port);

			suite.add(
				"sse-channel",
				() => {
					++count;

					channel.send({
						event: "message",
						data: count,
						id: count,
					});
				},
				{
					...options,
					onComplete: finished,
				}
			);
		})(),
		(async () => {
			let count = 0;
			const server = express();
			const port = 8020;

			const {SSE, send} = EasySse({endpoint: "/"});

			server.get("/", (req, res, next) => {
				SSE(req, res, next);
				res.flushHeaders();
			});

			await new Promise<void>((resolve) => server.listen(port, resolve));

			const finished = await createClientPool(port);

			suite.add(
				"easy-server-sent-events",
				() => {
					++count;

					send("all", "message", count);
				},
				{...options, onComplete: finished}
			);
		})(),
	]);

	suite.run();
})();
