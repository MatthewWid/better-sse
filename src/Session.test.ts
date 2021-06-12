import http from "http";
import EventSource from "eventsource";
import Session from "./Session";

const host = "127.0.0.1";
const port = 8080;
const url = `http://${host}:${port}/`;

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

let server: http.Server;
let eventsource: EventSource;

beforeEach(async () => {
	server = await createServer();
});

afterEach(async () => {
	if (eventsource && eventsource.readyState !== 2) {
		eventsource.close();
	}

	await closeServer(server);
});

describe("connection", () => {
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

	it("fires the disconnection event when the client kills the connection", (done) => {
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

	it("fires the disconnection event when the server closes the response stream", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("disconnected", () => {
				done();
			});

			session.on("connected", () => {
				res.end();
			});
		});

		eventsource = new EventSource(url);
	});

	it("returns the correct response status code and headers", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				expect(res.statusCode).toBe(200);
				expect(res.headersSent).toBeTruthy();
				expect(res.getHeader("Content-Type")).toBe("text/event-stream");
				expect(res.getHeader("Cache-Control")).toBe(
					"no-cache, no-transform"
				);
				expect(res.getHeader("Connection")).toBe("keep-alive");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("adds given headers to the response headers", (done) => {
		const additionalHeaders = {
			"x-test-header-1": "123",
			"x-test-header-2": "456",
		};

		server.on("request", (req, res) => {
			const session = new Session(req, res, {
				headers: additionalHeaders,
			});

			session.on("connected", () => {
				expect(res.getHeaders()).toMatchObject(additionalHeaders);

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("retry", () => {
	it("writes an initial retry field by default", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res);

			session.on("connected", () => {
				expect(write).toHaveBeenCalledTimes(2);
				expect(write).toHaveBeenCalledWith("retry:2000\n");
				expect(write).toHaveBeenCalledWith("\n");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("has the ability to modify the initial retry field", (done) => {
		server.on("request", (req, res) => {
			const write = jest.spyOn(res, "write");

			const session = new Session(req, res, {
				retry: 4000,
			});

			session.on("connected", () => {
				expect(write.mock.calls[0][0]).toContain("4000");

				done();
			});
		});

		eventsource = new EventSource(url);
	});
});

describe("last event ID", () => {
	it("starts with an empty last ID", (done) => {
		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				expect(session.lastId).toBe("");

				done();
			});
		});

		eventsource = new EventSource(url);
	});

	it("trusts and stores the given last ID by default", (done) => {
		const givenLastId = "12345678";

		server.on("request", (req, res) => {
			const session = new Session(req, res);

			session.on("connected", () => {
				expect(session.lastId).toBe(givenLastId);

				done();
			});
		});

		eventsource = new EventSource(url, {
			headers: {"Last-Event-ID": givenLastId},
		});
	});
});
