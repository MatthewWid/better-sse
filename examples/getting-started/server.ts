import {createSession, type Session} from "better-sse";
import express from "express";
import {getPublicDirPath} from "../utils";

const app = express();

app.use(express.static(getPublicDirPath(__dirname)));

/**
 * Needed to make TypeScript recognize the Session object attached to the response object.
 */
declare module "express-serve-static-core" {
	interface Response {
		sse: Session;
	}
}

app.get(
	"/sse",
	/**
	 * Attach the session instance to the response.
	 */
	async (req, res, next) => {
		const session = await createSession(req, res);

		res.sse = session;

		next();
	},
	/**
	 * Push a message with the event name "ping".
	 */
	(_, res) => {
		res.sse.push("Hello world!", "ping");
	}
);

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(
		`Server listening. Open http://localhost:${PORT} in your browser.`
	);
});
