import {Http2Session} from "./Http2Session";

/**
 * Create a new session and return the session instance once it has connected.
 */
const createHttp2Session = <State>(
	...args: ConstructorParameters<typeof Http2Session<State>>
): Promise<Http2Session<State>> =>
	new Promise((resolve) => {
		const session = new Http2Session<State>(...args);

		session.once("connected", () => {
			resolve(session);
		});
	});

export {createHttp2Session};
