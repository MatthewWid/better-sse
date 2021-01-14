import path from "path";
import express from "express";
import sse from "../..";
import {Readable} from "stream";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/sse", sse(), async (req, res) => {
	const stream = Readable.from("Hello from better-sse!");

	const done = await res.stream(stream);

	res.push("stream", {done});
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}.`);
});
