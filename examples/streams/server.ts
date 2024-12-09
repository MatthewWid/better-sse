import path from "node:path";
import {Readable} from "node:stream";
import {createSession} from "better-sse";
import express from "express";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/sse", async (req, res) => {
	/**
	 * Create a session instance.
	 */
	const session = await createSession(req, res);

	/**
	 * Create a sample readable stream.
	 */
	const stream = Readable.from([1, 2, 3]);

	/**
	 * Pipe the stream contents to the client.
	 */
	const done = await session.stream(stream);

	/**
	 * Push a final 'stream' event with the 'done' property.
	 */
	session.push({done}, "stream");
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(
		`Server listening. Open http://localhost:${PORT} in your browser.`
	);
});
