import {resolve} from "path";
import {promisify} from "util";
import {createSecureServer} from "http2";
import {
	type CertificateCreationOptions,
	type CertificateCreationResult,
	createCertificate as createCertificateCallback,
} from "pem";
import {createSession} from "better-sse";

(async () => {
	const createCertificate = promisify<
		CertificateCreationOptions,
		CertificateCreationResult
	>(createCertificateCallback);

	const indexHtmlPath = resolve(__dirname, "./public/index.html");
	const indexJsPath = resolve(__dirname, "./public/index.js");

	const {serviceKey: key, certificate: cert} = await createCertificate({
		selfSigned: true,
		days: 1,
	});

	const server = createSecureServer({key, cert}, async (req, res) => {
		const {":path": path, ":method": method} = req.headers;
		const {stream} = res;

		if (method !== "GET") {
			stream.respond({":status": 405});
			stream.end();
			return;
		}

		switch (path) {
			case "/": {
				stream.respondWithFile(indexHtmlPath);
				break;
			}
			case "/index.js": {
				stream.respondWithFile(indexJsPath);
				break;
			}
			case "/sse": {
				const session = await createSession(req, res);

				session.push("Hello world", "ping");

				break;
			}
			default: {
				stream.respond({":status": 404});
			}
		}
	});

	server.on("error", console.error);

	const PORT = process.env.PORT ?? 8443;

	server.listen(PORT, () => {
		console.log(
			`Server listening. Open https://localhost:${PORT} in your browser.`
		);
	});
})();
