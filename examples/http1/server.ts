import {readFileSync} from "node:fs";
import {RequestListener, createServer} from "node:http";
import {resolve} from "node:path";
import {createSession} from "../../build";

const indexHtmlPath = resolve(__dirname, "./public/index.html");
const indexJsPath = resolve(__dirname, "./public/index.js");

const indexHtmlContent = readFileSync(indexHtmlPath, "utf8");
const indexJsContent = readFileSync(indexJsPath, "utf8");

const handler: RequestListener = async (req, res) => {
	switch (req.url) {
		case "/": {
			res
				.writeHead(200, {
					"Content-Type": "text/html",
				})
				.end(indexHtmlContent);
			break;
		}
		case "/index.js": {
			res
				.writeHead(200, {
					"Content-Type": "application/javascript",
				})
				.end(indexJsContent);
			break;
		}
		case "/sse": {
			const session = await createSession(req, res);

			session.push("Hello world!", "ping");

			break;
		}
		default: {
			res.writeHead(404).end();
		}
	}
};

const server = createServer(handler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
