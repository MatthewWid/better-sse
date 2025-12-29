import Router from "@koa/router";
import {createSession} from "better-sse";
import Koa from "koa";
import serve from "koa-static";
import {getPublicDirPath} from "../utils";
import {KoaConnection} from "./connections/KoaConnection";

const app = new Koa();
const router = new Router();

app.use(serve(getPublicDirPath(__dirname)));

KoaConnection.addListeners(app);

router.get("/sse", async (ctx) => {
	const connection = new KoaConnection(ctx);

	const session = await createSession(connection);

	session.push("Hello world!", "ping");
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT ?? 8080;

app.listen(PORT, () => {
	console.log(
		`Server listening. Open http://localhost:${PORT} in your browser.`
	);
});
