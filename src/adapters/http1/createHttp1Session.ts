import type {DefaultSessionState} from "../../Session";
import {Http1Session} from "./Http1Session";

/**
 * Create a new session and return the session instance once it has connected.
 */
const createHttp1Session = <State = DefaultSessionState>(
	...args: ConstructorParameters<typeof Http1Session<State>>
): Promise<Http1Session<State>> =>
	new Promise((resolve) => {
		const session = new Http1Session<State>(...args);

		session.once("connected", () => {
			resolve(session);
		});
	});

export {createHttp1Session};
