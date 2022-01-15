import express, {Express} from "express";
import EventSource from "eventsource";
import {Suite} from "benchmark";
import {createSession, createChannel} from "better-sse";
// @ts-ignore
import SseChannel from "sse-channel";

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
			let server: Express;
			const port = 8000;
			const channel = createChannel();

			suite.add("better-sse", () => {
				channel.broadcast(++count);
			});

			server = express();

			server.get("/", async (req, res) => {
				const session = await createSession(req, res);

				channel.register(session);
			});

			await new Promise<void>((resolve) => server.listen(port, resolve));

			new EventSource(`http://localhost:${port}`);

			await new Promise((resolve) =>
				channel.once("session-registered", resolve)
			);
		})(),
		(async () => {
			let count = 0;
			let server: Express;
			const port = 8010;
			const channel = new SseChannel({jsonEncode: true});

			suite.add("sse-channel", () => {
				++count;

				channel.send({
					event: "message",
					data: count,
					id: count,
				});
			});

			server = express();

			server.get("/", (req, res) => {
				channel.addClient(req, res);
			});

			await new Promise<void>((resolve) => server.listen(port, resolve));

			new EventSource(`http://localhost:${port}`);

			await new Promise((resolve) => channel.once("connect", resolve));
		})(),
	]);

	suite.run();
})();
