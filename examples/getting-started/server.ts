import path from "path";
import express from "express";
import sse from "better-sse";

const app = express();

const BASEDIR = path.resolve(__dirname);

app.use(express.static(path.join(BASEDIR, "./public")));

app.get("/sse", sse(), (req, res) => {
	res.sse.push("ping", "Hello world!");
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}.`);
});
