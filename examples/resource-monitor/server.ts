import path from "node:path";
import {createSession} from "better-sse";
import express from "express";
import {resource} from "./channels/resource";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);

	resource.register(session);
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(
		`Server listening. Open http://localhost:${PORT} in your browser.`
	);
});
