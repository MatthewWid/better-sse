import path from "path";
import express from "express";
import {createSession} from "better-sse";
import {Readable} from "stream";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);

	const stream = Readable.from([1, 2, 3]);

	const done = await session.stream(stream);

	session.push("stream", {done});
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}.`);
});
