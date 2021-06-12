import http from "http";
import EventSource from "eventsource";
import Session from "./Session";

const host = "127.0.0.1";
const port = 8080;
const url = `http://${host}:${port}`;

const createServer = () =>
	new Promise<http.Server>((resolve, reject) => {
		const server = http.createServer().listen(port, host);

		server.on("listening", () => resolve(server));
		server.on("error", reject);
	});

const closeServer = (server: http.Server) =>
	new Promise<void>((resolve, reject) => {
		if (server.listening) {
			server.close((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		} else {
			resolve();
		}
	});

describe("initialisation", () => {
	let server: http.Server;
	let eventsource: EventSource;

	beforeEach(async () => {
		server = await createServer();
	});

	afterEach(async () => {
		if (eventsource) {
			eventsource.close();
		}

		await closeServer(server);
	});

	it("constructs without errors when giving no options", async (done) => {
		server.on("request", (req, res) => {
			expect(() => {
				new Session(req, res);
			}).not.toThrow();

			done();
		});

		eventsource = new EventSource(url);
	});

	it("fires the connection open event non-synchronously after response headers are sent", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("fires the disconnection event when the client kills the connection", async (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				session.on("disconnected", () => {
					done();
				});
			});
		});

		eventsource = new EventSource(url);

		eventsource.addEventListener("open", () => {
			eventsource.close();
		});
	});
});
