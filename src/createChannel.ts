import {Channel} from "./Channel";

const createChannel = <
	State extends Record<string, unknown>,
	SessionState extends Record<string, unknown>
>(
	...args: ConstructorParameters<typeof Channel>
): Channel<State, SessionState> => new Channel<State, SessionState>(...args);

export {createChannel};
