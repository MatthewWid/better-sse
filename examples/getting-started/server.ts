import path from "path";
import express from "express";
import {createSession, Session} from "better-sse";

const app = express();

app.use(express.static(path.resolve(__dirname, "./public")));

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
	 * Push an event named 'ping' to the client.
	 */
	(_, res) => {
		res.sse.push("ping", "Hello world!");
	}
);

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}.`);
});
