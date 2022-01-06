import {Channel} from "./Channel";

const createChannel = <State extends Record<string, unknown>>(
	...args: ConstructorParameters<typeof Channel>
): Channel<State> => new Channel<State>(...args);

export {createChannel};
