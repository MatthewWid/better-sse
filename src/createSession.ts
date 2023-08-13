import {Session} from "./Session";

/**
 * Create a new session and return the session instance once it has connected.
 */
const createSession = <State extends Record<string, unknown>>(
	...args: ConstructorParameters<typeof Session>
): Promise<Session<State>> =>
	new Promise((resolve) => {
		const session = new Session<State>(...args);

		session.once("connected", () => {
			resolve(session);
		});
	});

export {createSession};
