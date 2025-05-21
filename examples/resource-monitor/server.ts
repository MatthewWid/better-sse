import {createSession} from "better-sse";
import express from "express";
import {getPublicDirPath} from "../utils";
import {resource} from "./channels/resource";

const app = express();

app.use(express.static(getPublicDirPath(__dirname)));

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
