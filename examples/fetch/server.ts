import * as http from "node:http";
import {createRequestListener} from "@mjackson/node-fetch-server";
import {createResponse} from "better-sse";
import {getFrontendFiles} from "../utils";

const {indexHtmlContent, indexJsContent} = getFrontendFiles(__dirname);

const handler = async (request: Request) => {
	const url = new URL(request.url);

	switch (url.pathname) {
		case "/": {
			return new Response(indexHtmlContent, {
				headers: {
					"Content-Type": "text/html",
				},
			});
		}
		case "/index.js": {
			return new Response(indexJsContent, {
				headers: {
					"Content-Type": "application/javascript",
				},
			});
		}
		case "/sse": {
			return createResponse(request, (session) => {
				session.push("Hello world!", "ping");
			});
		}
		default: {
			return new Response("404 Not Found", {
				status: 404,
				headers: {
					"Content-Type": "text/plain",
				},
			});
		}
	}
};

const server = http.createServer(createRequestListener(handler));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
