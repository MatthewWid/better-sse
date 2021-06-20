import Session from "./Session";

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
