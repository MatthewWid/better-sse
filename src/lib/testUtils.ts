import http from "node:http";
import http2 from "node:http2";
import type net from "node:net";
import type {AddressInfo} from "node:net";
import type {EventBuffer} from "../EventBuffer";
import type {Session} from "../Session";

const createHttpServer = (): Promise<http.Server> =>
	new Promise<http.Server>((resolve, reject) => {
		const server = http.createServer().listen();

		server.on("listening", () => resolve(server));
		server.on("error", reject);
	});

const createHttp2Server = (): Promise<http2.Http2Server> =>
	new Promise<http2.Http2Server>((resolve, reject) => {
		const server = http2.createServer().listen();

		server.on("listening", () => resolve(server));
		server.on("error", reject);
	});

const closeServer = (server: net.Server): Promise<void> =>
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

const getUrl = (server: net.Server): string =>
	`http://localhost:${(server.address() as AddressInfo).port}`;

const waitForConnect = (session: Session): Promise<void> =>
	new Promise((resolve) => {
		if (session.isConnected) {
			resolve();
		} else {
			session.on("connected", resolve);
		}
	});

const getBuffer = (session: Session): EventBuffer =>
	Reflect.get(session, "buffer");

export {
	createHttpServer,
	createHttp2Server,
	closeServer,
	getUrl,
	waitForConnect,
	getBuffer,
};
