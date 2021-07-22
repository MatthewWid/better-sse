import path from "path";
import express from "express";
import {createSession, Session} from "better-sse";
import resourceChannel from "./channels/resource";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);

	resourceChannel.register(session);
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}.`);
});
