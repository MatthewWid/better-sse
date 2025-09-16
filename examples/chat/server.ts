import {createSession} from "better-sse";
import {getPublicDirPath} from "../utils";

import express from "express";
import {chatChannel, isUsernameTaken} from "./channels/chat";

const app = express();

app.use(express.static(getPublicDirPath(__dirname)));
app.use(express.json());

app.get("/chat/:username/sse", async (req, res) => {
	const {username} = req.params;

	if (isUsernameTaken(username)) {
		res.sendStatus(409);
		return;
	}

	const session = await createSession(req, res, {
		state: {
			username,
		},
	});

	chatChannel.register(session);
});

app.get("/chat/:username/check", (req, res) => {
	const {username} = req.params;

	if (isUsernameTaken(username)) {
		res.sendStatus(409);
	} else {
		res.sendStatus(204);
	}
});

app.post("/chat/:username/message", (req, res) => {
	const {username} = req.params;
	const {content} = req.body;

	if (!username || !content) {
		res.status(400).json({error: "Username and content are required."});
		return;
	}

	chatChannel.broadcast({username, content});

	res.sendStatus(204);
});

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(
		`Server listening. Open http://localhost:${PORT} in your browser.`
	);
});
