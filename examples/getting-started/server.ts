import path from "path";
import express from "express";
import sse from "better-sse";
import {Readable} from "stream";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/sse", sse(), async (req, res) => {
	res.push("ping", "Hello world!");
	const rs = Readable.from("Hello from better-sse", {encoding: "utf-8"});
	const done = await res.stream(rs, {sseEvent: "streamData"});
	res.push("streamData", {done});
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}.`);
});
