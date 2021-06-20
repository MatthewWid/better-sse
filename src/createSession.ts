import Session from "./Session";

/**
 * Create a new session and return the session instance once it has connected.
 */
const createSession = (
	...args: ConstructorParameters<typeof Session>
): Promise<Session> =>
	new Promise((resolve) => {
		const session = new Session(...args);

		session.once("connected", () => {
			resolve(session);
		});
	});

export default createSession;
