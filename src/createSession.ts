import type {
	IncomingMessage as Http1ServerRequest,
	ServerResponse as Http1ServerResponse,
} from "node:http";
import type {Http2ServerRequest, Http2ServerResponse} from "node:http2";
import {
	type DefaultSessionState,
	Session,
	type SessionOptions,
} from "./Session";

/**
 * Create a new session.
 *
 * When using the Fetch API, resolves immediately with a session instance before it has connected.
 * You can listen for the `connected` event on the session to know when it has connected, or
 * otherwise use the shorthand `createResponse` function that does so for you instead.
 *
 * When using the Node HTTP APIs, waits for the session to connect before resolving with its instance.
 */
function createSession<State = DefaultSessionState>(
	req: Http1ServerRequest,
	res: Http1ServerResponse,
	options?: SessionOptions<State>
): Promise<Session<State>>;
function createSession<State = DefaultSessionState>(
	req: Http2ServerRequest,
	res: Http2ServerResponse,
	options?: SessionOptions<State>
): Promise<Session<State>>;
function createSession<State = DefaultSessionState>(
	req: Request,
	res?: Response,
	options?: SessionOptions<State>
): Promise<Session<State>>;
function createSession<State = DefaultSessionState>(
	req: Request,
	options?: SessionOptions<State>
): Promise<Session<State>>;
function createSession<State = DefaultSessionState>(
	req: Http1ServerRequest | Http2ServerRequest | Request,
	res?:
		| Http1ServerResponse
		| Http2ServerResponse
		| Response
		| SessionOptions<State>,
	options?: SessionOptions<State>
): Promise<Session<State>> {
	return new Promise((resolve) => {
		/**
		 * TypeScript compares every type in the union with every type in every overload,
		 * guaranteeing an incompatibility even if each of the passed combinations of arguments
		 * actually does have at least one matching counterpart.
		 *
		 * As such, we must decide between this small ignore-line or having the
		 * `createSession` and `Session#constructor` functions not be overloaded at all.
		 *
		 * @see https://github.com/microsoft/TypeScript/issues/14107
		 */
		// @ts-ignore
		const session = new Session<State>(req, res, options);

		if (req instanceof Request) {
			resolve(session);
		} else {
			session.once("connected", () => {
				resolve(session);
			});
		}
	});
}

export {createSession};
