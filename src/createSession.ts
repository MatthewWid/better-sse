import {Session, type DefaultSessionState} from "./Session";

/**
 * Create a new session and return the session instance once it has connected.
 */
const createSession = <State = DefaultSessionState>(
	...args: ConstructorParameters<typeof Session<State>>
): Promise<Session<State>> =>
	new Promise((resolve) => {
		const session = new Session<State>(...args);

		session.once("connected", () => {
			resolve(session);
		});
	});

export {createSession};
