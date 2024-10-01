import {Http2CompatSession} from "./Http2CompatSession";

/**
 * Create a new session and return the session instance once it has connected.
 */
const createHttp2CompatSession = <State>(
	...args: ConstructorParameters<typeof Http2CompatSession<State>>
): Promise<Http2CompatSession<State>> =>
	new Promise((resolve) => {
		const session = new Http2CompatSession<State>(...args);

		session.once("connected", () => {
			resolve(session);
		});
	});

export {createHttp2CompatSession};
