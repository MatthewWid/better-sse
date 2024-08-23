import {Channel} from "./Channel";

const createChannel = <State, SessionState>(
	...args: ConstructorParameters<typeof Channel<State, SessionState>>
): Channel<State, SessionState> => new Channel<State, SessionState>(...args);

export {createChannel};
