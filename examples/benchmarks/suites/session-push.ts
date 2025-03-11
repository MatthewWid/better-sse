import { Bench } from "tinybench";
import { createExpressTask } from "../lib/createExpressTask";
import { createSession, type Session } from "better-sse";
import { createEventSource } from "../lib/createEventSource";

export const sessionPushBench = new Bench({ name: "session-push" });

createExpressTask(sessionPushBench, "better-sse", async (server, listen) => {
	let session: Session;

	server.get("/sse", async (req, res) => {
		session = await createSession(req, res);
	});

	const port = await listen();

	const eventSource = await createEventSource(port);

	return {
		run: () => void session.push(null),
		teardown: () => eventSource.close(),
	};
});
